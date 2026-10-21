/**
 * Saves and lists exercise attempts. Database only: the AI call happens in the browser, so nothing
 * here ever sees an API key.
 */

/** @typedef {import('@libsql/client').Client} Client */

export const EXERCISE_TYPES = ['word-nuance']
const MAX_ITEM_BYTES = 20_000

/**
 * The shape the page stores for a Word Nuance item.
 * @typedef {{
 *   before: string, after: string,
 *   options: { word: string, note: string }[],
 *   correctIndex: number, reason: string
 * }} StoredItem
 */

/** @param {unknown} v @returns {v is StoredItem} */
export function isStoredItem(v) {
  const o = /** @type {Record<string, any>} */ (v)
  return Boolean(
    o &&
    typeof o === 'object' &&
    typeof o.before === 'string' &&
    typeof o.after === 'string' &&
    typeof o.reason === 'string' &&
    Array.isArray(o.options) &&
    o.options.length >= 2 &&
    o.options.length <= 8 &&
    o.options.every(
      (/** @type {any} */ x) => x && typeof x.word === 'string' && typeof x.note === 'string'
    ) &&
    Number.isInteger(o.correctIndex) &&
    o.correctIndex >= 0 &&
    o.correctIndex < o.options.length
  )
}

/**
 * @param {Client} db
 * @param {{ type?: string, word: string, item: unknown, chosenIndex: number, model?: string | null, flagged?: boolean }} a
 * @returns {Promise<{ ok: true, id: number, correct: boolean } | { ok: false, error: string }>}
 */
export async function saveAttempt(db, a) {
  const type = a.type ?? 'word-nuance'
  if (!EXERCISE_TYPES.includes(type)) return { ok: false, error: 'Unknown exercise type.' }
  const word = String(a.word ?? '')
    .trim()
    .slice(0, 60)
  if (!word) return { ok: false, error: 'A word is required.' }
  if (!isStoredItem(a.item)) return { ok: false, error: 'That exercise could not be saved.' }
  const json = JSON.stringify(a.item)
  if (json.length > MAX_ITEM_BYTES) return { ok: false, error: 'That exercise is too large.' }
  if (
    !Number.isInteger(a.chosenIndex) ||
    a.chosenIndex < 0 ||
    a.chosenIndex >= a.item.options.length
  )
    return { ok: false, error: 'That choice is not on the list.' }

  const correct = a.chosenIndex === a.item.correctIndex
  const res = await db.execute({
    sql: `INSERT INTO exercise_attempt (exercise_type, word, item, chosen_index, correct, model, flagged)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      type,
      word,
      json,
      a.chosenIndex,
      correct ? 1 : 0,
      a.model ? String(a.model).slice(0, 60) : null,
      a.flagged ? 1 : 0
    ]
  })
  return { ok: true, id: Number(res.lastInsertRowid), correct }
}

/**
 * @param {Client} db
 * @param {number} id
 * @param {boolean} flagged
 * @returns {Promise<boolean>} whether an attempt was changed
 */
export async function flagAttempt(db, id, flagged) {
  const res = await db.execute({
    sql: 'UPDATE exercise_attempt SET flagged = ? WHERE id = ?',
    args: [flagged ? 1 : 0, id]
  })
  return res.rowsAffected > 0
}

/**
 * Most recent first.
 * @param {Client} db
 * @param {number} [limit]
 */
export async function listAttempts(db, limit = 20) {
  const rows = (
    await db.execute({
      sql: `SELECT id, exercise_type, word, item, chosen_index, correct, model, flagged, created_at
            FROM exercise_attempt ORDER BY id DESC LIMIT ?`,
      args: [Math.max(1, Math.min(200, Math.floor(limit)))]
    })
  ).rows
  return rows.map((r) => ({
    id: Number(r.id),
    type: String(r.exercise_type),
    word: String(r.word),
    item: /** @type {StoredItem} */ (JSON.parse(String(r.item))),
    chosenIndex: Number(r.chosen_index),
    correct: Number(r.correct) === 1,
    model: r.model === null ? null : String(r.model),
    flagged: Number(r.flagged) === 1,
    createdAt: String(r.created_at)
  }))
}

/** @param {Client} db */
export async function attemptStats(db) {
  const r = (
    await db.execute(
      'SELECT COUNT(*) AS total, COALESCE(SUM(correct), 0) AS right FROM exercise_attempt'
    )
  ).rows[0]
  return { total: Number(r.total), correct: Number(r.right) }
}
