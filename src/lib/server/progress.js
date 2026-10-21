import { localDate } from './daily/select.js'
import { activeDatesFrom, computeStreak } from './streak.js'

/**
 * How many of today's words the learner has opened or reviewed today.
 * @param {import('@libsql/client').Client} db
 * @param {number[]} wordIds
 * @param {string} timezone
 * @param {Date} [now]
 */
export async function getTodayProgress(db, wordIds, timezone, now = new Date()) {
  if (!wordIds.length) return { done: 0, total: 0 }
  const today = localDate(now, timezone)
  const res = await db.execute({
    sql: `SELECT word_id, answered_at FROM review_attempt
          WHERE word_id IN (${wordIds.map(() => '?').join(',')})`,
    args: wordIds
  })
  const done = new Set(
    res.rows
      .filter((r) => localDate(new Date(String(r.answered_at)), timezone) === today)
      .map((r) => Number(r.word_id))
  )
  return { done: done.size, total: wordIds.length }
}

/**
 * Consecutive active days, counting any opened card or review.
 * @param {import('@libsql/client').Client} db
 * @param {string} timezone
 * @param {Date} [now]
 */
export async function getStreak(db, timezone, now = new Date()) {
  const res = await db.execute('SELECT answered_at FROM review_attempt')
  const dates = activeDatesFrom(
    res.rows.map((r) => String(r.answered_at)),
    timezone
  )
  return computeStreak(dates, localDate(now, timezone))
}

/**
 * Which of these words the learner has ever opened or reviewed.
 * @param {import('@libsql/client').Client} db
 * @param {number[]} wordIds
 * @returns {Promise<Set<number>>}
 */
export async function getSeenWordIds(db, wordIds) {
  if (!wordIds.length) return new Set()
  const res = await db.execute({
    sql: `SELECT DISTINCT word_id FROM review_attempt
          WHERE word_id IN (${wordIds.map(() => '?').join(',')})`,
    args: wordIds
  })
  return new Set(res.rows.map((r) => Number(r.word_id)))
}

/**
 * Whether any daily set exists before this local date (so a missed day can be offered).
 * @param {import('@libsql/client').Client} db
 * @param {string} date
 */
export async function hasEarlierSet(db, date) {
  const res = await db.execute({
    sql: 'SELECT 1 FROM daily_set WHERE local_date < ? LIMIT 1',
    args: [date]
  })
  return res.rows.length > 0
}
