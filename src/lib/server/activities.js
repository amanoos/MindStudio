import { localDate } from './daily/select.js'

/** @typedef {import('@libsql/client').Client} Client */
/** @typedef {'teaser' | 'capsule' | 'critical'} ActivityType */

const TYPE_ORDER = /** @type {const} */ (['teaser', 'capsule', 'critical'])

/** Short label shown on cards: the puzzle kind, topic area or thinking skill. */
function labelOf(/** @type {any} */ data) {
  // The thinking skill of a critical prompt is deliberately left out: its name gives the answer away.
  return String(data.kind ?? data.area ?? '')
}

/** @param {string} str */
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Activities of a type (or all), with how often each has been attempted.
 * @param {Client} db
 * @param {{ type?: ActivityType }} [opts]
 */
export async function listActivities(db, { type } = {}) {
  const res = await db.execute({
    sql: `SELECT a.id, a.slug, a.type, a.title, a.difficulty, a.data,
                 (SELECT COUNT(*) FROM activity_attempt t WHERE t.activity_id = a.id) AS attempts
          FROM activity a
          WHERE a.status = 'published' ${type ? 'AND a.type = ?' : ''}
          ORDER BY a.id`,
    args: type ? [type] : []
  })
  return res.rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    type: /** @type {ActivityType} */ (String(r.type)),
    title: String(r.title),
    difficulty: Number(r.difficulty),
    label: labelOf(JSON.parse(String(r.data))),
    attempts: Number(r.attempts),
    done: Number(r.attempts) > 0
  }))
}

/**
 * Per-type totals, for the Mind Studio hub.
 * @param {Client} db
 */
export async function getTypeCounts(db) {
  const all = await listActivities(db)
  return TYPE_ORDER.map((type) => {
    const mine = all.filter((a) => a.type === type)
    return { type, total: mine.length, done: mine.filter((a) => a.done).length }
  })
}

/**
 * One activity with its full data. Answers are held back from anything sent to the browser.
 * @param {Client} db
 * @param {string} type
 * @param {string} slug
 */
export async function getActivity(db, type, slug) {
  const res = await db.execute({
    sql: "SELECT id, slug, type, title, difficulty, data FROM activity WHERE slug = ? AND type = ? AND status = 'published'",
    args: [slug, type]
  })
  const r = res.rows[0]
  if (!r) return null
  return {
    id: Number(r.id),
    slug: String(r.slug),
    type: /** @type {ActivityType} */ (String(r.type)),
    title: String(r.title),
    difficulty: Number(r.difficulty),
    data: JSON.parse(String(r.data))
  }
}

/**
 * What the browser may see before answering: no answer index, reasoning or explanation.
 * @param {NonNullable<Awaited<ReturnType<typeof getActivity>>>} activity
 */
export function publicView(activity) {
  const open = { ...activity.data }
  // The skill name is held back too: "survivorship bias" would give the answer away.
  for (const key of ['answerIndex', 'reasoning', 'explanation', 'skill']) delete open[key]
  return { ...activity, data: open }
}

/**
 * Check a multiple-choice answer, log the attempt, and reveal the reasoning. Wrong answers are
 * never punished: they simply reveal the answer and the explanation.
 * @param {Client} db
 * @param {string} slug
 * @param {number} choice
 * @param {Date} [now]
 */
export async function checkAnswer(db, slug, choice, now = new Date()) {
  const res = await db.execute({
    sql: "SELECT id, type, data FROM activity WHERE slug = ? AND status = 'published'",
    args: [slug]
  })
  const row = res.rows[0]
  if (!row) throw new Error('Unknown activity')
  const data = JSON.parse(String(row.data))
  if (row.type === 'capsule') throw new Error('This activity has no answer to check')
  if (!Number.isInteger(choice) || choice < 0 || choice >= data.options.length)
    throw new Error('Choose one of the options')

  const correct = choice === data.answerIndex
  await db.execute({
    sql: 'INSERT INTO activity_attempt (activity_id, response, result, completed_at) VALUES (?, ?, ?, ?)',
    args: [Number(row.id), String(choice), correct ? 'correct' : 'incorrect', now.toISOString()]
  })
  return {
    correct,
    answerIndex: /** @type {number} */ (data.answerIndex),
    reveal: String(data.reasoning ?? data.explanation ?? ''),
    skill: data.skill ? String(data.skill) : null
  }
}

/**
 * Log a finished capsule, with the learner's optional reflection.
 * @param {Client} db
 * @param {string} slug
 * @param {string} reflection
 * @param {Date} [now]
 */
export async function recordCapsule(db, slug, reflection, now = new Date()) {
  const res = await db.execute({
    sql: "SELECT id FROM activity WHERE slug = ? AND type = 'capsule' AND status = 'published'",
    args: [slug]
  })
  if (!res.rows[0]) throw new Error('Unknown capsule')
  await db.execute({
    sql: 'INSERT INTO activity_attempt (activity_id, response, result, completed_at) VALUES (?, ?, ?, ?)',
    args: [Number(res.rows[0].id), reflection.trim().slice(0, 1000), 'completed', now.toISOString()]
  })
}

/**
 * Recent attempts, newest first.
 * @param {Client} db
 * @param {number} [limit]
 */
export async function getActivityHistory(db, limit = 100) {
  const res = await db.execute({
    sql: `SELECT t.id, t.result, t.response, t.completed_at, a.slug, a.type, a.title
          FROM activity_attempt t JOIN activity a ON a.id = t.activity_id
          ORDER BY t.completed_at DESC, t.id DESC LIMIT ?`,
    args: [limit]
  })
  return res.rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    type: /** @type {ActivityType} */ (String(r.type)),
    title: String(r.title),
    result: String(r.result),
    completedAt: String(r.completed_at),
    reflection: String(r.type) === 'capsule' ? String(r.response ?? '') : ''
  }))
}

/**
 * The one suggested activity for a local date. The type rotates by day, and within a type it
 * prefers something not yet tried, so the daily pick stays fresh without ever repeating on a day.
 * @param {Client} db
 * @param {string} date YYYY-MM-DD
 */
export async function pickDaily(db, date) {
  const all = await listActivities(db)
  if (!all.length) return null
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)
  const type = TYPE_ORDER[((dayNumber % 3) + 3) % 3]
  const ofType = all.filter((a) => a.type === type)
  const pool = ofType.length ? ofType : all
  const fresh = pool.filter((a) => !a.done)
  const candidates = fresh.length ? fresh : pool
  return candidates[hash(date) % candidates.length]
}

/**
 * @param {Date} now
 * @param {string} timezone
 */
export const todayFor = (now, timezone) => localDate(now, timezone)
