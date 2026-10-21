import { localDate, pickWords } from './select.js'

/**
 * @typedef {{
 *   id: number, slug: string, headword: string, pos: string, topic: string,
 *   confidence: 'sourced' | 'uncertain', content: any
 * }} SetWord
 * @typedef {{ date: string, status: 'ready' | 'low-reserve', words: SetWord[], remaining?: number }} DailySet
 */

/**
 * @param {import('@libsql/client').Client | import('@libsql/client').Transaction} db
 * @param {string} date
 * @returns {Promise<DailySet | null>}
 */
export async function findSet(db, date) {
  const set = await db.execute({
    sql: 'SELECT id FROM daily_set WHERE local_date = ?',
    args: [date]
  })
  if (!set.rows.length) return null
  const rows = await db.execute({
    sql: `SELECT w.id, w.slug, w.display_headword, w.pos, w.topic, w.confidence, c.data
          FROM daily_set_word d
          JOIN word w ON w.id = d.word_id
          JOIN word_content c ON c.word_id = w.id
          WHERE d.set_id = ?
          ORDER BY d.display_order`,
    args: [Number(set.rows[0].id)]
  })
  return {
    date,
    status: 'ready',
    words: rows.rows.map((r) => ({
      id: Number(r.id),
      slug: String(r.slug),
      headword: String(r.display_headword),
      pos: String(r.pos),
      topic: String(r.topic),
      confidence: /** @type {'sourced' | 'uncertain'} */ (String(r.confidence)),
      content: JSON.parse(String(r.data))
    }))
  }
}

/**
 * Today's set for the given timezone. Creates it on first request of the local date, inside a
 * write transaction; every later or concurrent request gets the same five words. Unique
 * constraints on daily_set.local_date and featured_ledger.word_id make duplicates impossible
 * even if this code were wrong.
 * @param {import('@libsql/client').Client} db
 * @param {{ now?: Date, timezone?: string, count?: number, date?: string }} [opts]
 *   `date` overrides the local date (used for the opt-in "catch up on yesterday" set)
 * @returns {Promise<DailySet>}
 */
export async function getOrCreateDailySet(
  db,
  { now = new Date(), timezone = 'UTC', count = 5, date: forcedDate } = {}
) {
  const date = forcedDate ?? localDate(now, timezone)
  const existing = await findSet(db, date)
  if (existing) return existing

  // Serialize creation inside this process (SQLite allows one writer), and retry if another
  // process holds the write lock. The unique constraints remain the real guarantee.
  const run = creating.then(async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await createSet(db, date, timezone, count)
      } catch (err) {
        const busy = /** @type {any} */ (err)?.code === 'SQLITE_BUSY'
        if (!busy || attempt >= 5) throw err
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)))
      }
    }
  })
  creating = run.then(
    () => {},
    () => {}
  )
  return run
}

/** @type {Promise<void>} */
let creating = Promise.resolve()

/**
 * @param {import('@libsql/client').Client} db
 * @param {string} date
 * @param {string} timezone
 * @param {number} count
 * @returns {Promise<DailySet>}
 */
async function createSet(db, date, timezone, count) {
  const tx = await db.transaction('write')
  try {
    const raced = await findSet(tx, date)
    if (raced) {
      await tx.rollback()
      return raced
    }

    const candidates = (
      await tx.execute(
        `SELECT id, topic FROM word
         WHERE status = 'published' AND id NOT IN (SELECT word_id FROM featured_ledger)`
      )
    ).rows.map((r) => ({ id: Number(r.id), topic: String(r.topic) }))

    if (candidates.length < count) {
      await tx.rollback()
      return { date, status: 'low-reserve', words: [], remaining: candidates.length }
    }

    const picked = pickWords(candidates, count, date)
    const set = await tx.execute({
      sql: 'INSERT INTO daily_set (local_date, timezone) VALUES (?, ?)',
      args: [date, timezone]
    })
    const setId = Number(set.lastInsertRowid)
    for (const [i, w] of picked.entries()) {
      await tx.execute({
        sql: 'INSERT INTO daily_set_word (set_id, word_id, display_order) VALUES (?, ?, ?)',
        args: [setId, w.id, i + 1]
      })
      await tx.execute({
        sql: 'INSERT INTO featured_ledger (word_id, first_featured_date) VALUES (?, ?)',
        args: [w.id, date]
      })
    }
    await tx.commit()
  } catch (err) {
    await tx.rollback().catch(() => {})
    const raced = await findSet(db, date)
    if (raced) return raced
    throw err
  } finally {
    tx.close()
  }
  return /** @type {DailySet} */ (await findSet(db, date))
}
