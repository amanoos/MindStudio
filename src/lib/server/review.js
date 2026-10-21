import { localDate } from './daily/select.js'
import { schedule } from './srs.js'

/** @typedef {import('@libsql/client').Client} Client */
/** @typedef {import('./srs.js').Rating} Rating */

const RATINGS = ['again', 'hard', 'good', 'easy']

/**
 * Save a rating: schedule the next review and log the attempt. Reviewing is never a new
 * feature, so the featured ledger is untouched.
 * @param {Client} db
 * @param {{ wordId: number, rating: string, activityType: string, correct?: boolean, now?: Date }} input
 */
export async function recordRating(
  db,
  { wordId, rating, activityType, correct, now = new Date() }
) {
  if (!RATINGS.includes(rating)) throw new Error(`Unknown rating: ${rating}`)

  const featured = await db.execute({
    sql: 'SELECT 1 FROM featured_ledger WHERE word_id = ?',
    args: [wordId]
  })
  if (!featured.rows.length) throw new Error('That word has not been featured yet')

  const current = await db.execute({
    sql: 'SELECT step FROM review_state WHERE word_id = ?',
    args: [wordId]
  })
  const step = Number(current.rows[0]?.step ?? 0)
  const next = schedule({ step }, /** @type {Rating} */ (rating), now)

  await db.batch(
    [
      {
        sql: `INSERT INTO review_state (word_id, state, step, due_at, last_reviewed_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(word_id) DO UPDATE SET
                state = excluded.state, step = excluded.step,
                due_at = excluded.due_at, last_reviewed_at = excluded.last_reviewed_at`,
        args: [wordId, next.state, next.step, next.dueAt.toISOString(), now.toISOString()]
      },
      {
        sql: `INSERT INTO review_attempt (word_id, activity_type, result, rating, answered_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          wordId,
          activityType,
          correct === undefined ? 'rated' : correct ? 'correct' : 'incorrect',
          rating,
          now.toISOString()
        ]
      }
    ],
    'write'
  )
  return next
}

/**
 * Note that the learner opened a word card (at most once per local day). Opening a card is
 * engagement, not mastery: it never touches the review schedule.
 * @param {Client} db
 * @param {number} wordId
 * @param {string} timezone
 * @param {Date} [now]
 */
export async function recordView(db, wordId, timezone, now = new Date()) {
  const today = localDate(now, timezone)
  const prior = await db.execute({
    sql: "SELECT answered_at FROM review_attempt WHERE word_id = ? AND activity_type = 'view'",
    args: [wordId]
  })
  if (prior.rows.some((r) => localDate(new Date(String(r.answered_at)), timezone) === today)) return
  await db.execute({
    sql: `INSERT INTO review_attempt (word_id, activity_type, result, answered_at)
          VALUES (?, 'view', 'viewed', ?)`,
    args: [wordId, now.toISOString()]
  })
}

/**
 * Mark a word to come back to, due immediately.
 * @param {Client} db
 * @param {number} wordId
 * @param {Date} [now]
 */
export async function markRevisit(db, wordId, now = new Date()) {
  await db.execute({
    sql: `INSERT INTO review_state (word_id, state, step, due_at)
          VALUES (?, 'revisit', 0, ?)
          ON CONFLICT(word_id) DO UPDATE SET state = 'revisit', due_at = excluded.due_at`,
    args: [wordId, now.toISOString()]
  })
}

/**
 * Featured words to review. Normally those due now (never-reviewed words count as due). With
 * `scope: 'today'`, today's five regardless of schedule, for the end-of-day recall check.
 * @param {Client} db
 * @param {{
 *   now?: Date, today?: string, scope?: 'due' | 'today', topic?: string, pos?: string,
 *   favorites?: boolean, limit?: number
 * }} [opts]
 */
export async function getReviewWords(
  db,
  { now = new Date(), today, scope = 'due', topic, pos, favorites = false, limit = 10 } = {}
) {
  /** @type {string[]} */
  const where = []
  /** @type {(string | number)[]} */
  const args = []

  if (scope === 'today' && today) {
    where.push('f.first_featured_date = ?')
    args.push(today)
  } else {
    where.push('(rs.due_at IS NULL OR rs.due_at <= ?)')
    args.push(now.toISOString())
  }
  if (topic) {
    where.push('w.topic = ?')
    args.push(topic)
  }
  if (pos) {
    where.push('w.pos LIKE ?')
    args.push(`%${pos}%`)
  }
  if (favorites) where.push('COALESCE(n.favorite, 0) = 1')

  const res = await db.execute({
    sql: `SELECT w.id, w.slug, w.display_headword, w.pos, w.topic, c.data,
                 COALESCE(rs.state, 'new') AS state
          FROM featured_ledger f
          JOIN word w ON w.id = f.word_id
          JOIN word_content c ON c.word_id = w.id
          LEFT JOIN review_state rs ON rs.word_id = w.id
          LEFT JOIN user_word_note n ON n.word_id = w.id
          WHERE ${where.join(' AND ')}
          ORDER BY COALESCE(rs.due_at, ''), w.id
          LIMIT ?`,
    args: [...args, limit]
  })
  return res.rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    headword: String(r.display_headword),
    pos: String(r.pos),
    topic: String(r.topic),
    state: String(r.state),
    content: JSON.parse(String(r.data))
  }))
}

/**
 * How many words are due right now.
 * @param {Client} db
 * @param {Date} [now]
 */
export async function countDue(db, now = new Date()) {
  const res = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM featured_ledger f
          LEFT JOIN review_state rs ON rs.word_id = f.word_id
          WHERE rs.due_at IS NULL OR rs.due_at <= ?`,
    args: [now.toISOString()]
  })
  return Number(res.rows[0].n)
}
