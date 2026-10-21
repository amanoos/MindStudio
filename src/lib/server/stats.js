import { localDate } from './daily/select.js'
import { countDue } from './review.js'
import { activeDatesFrom, computeStreak, dayBefore } from './streak.js'

/** @typedef {import('@libsql/client').Client} Client */

const STATES = ['new', 'learning', 'familiar', 'mastered', 'revisit']
const WEEKS = 4

/** The local date `days` before `date`. @param {string} date @param {number} days */
function daysBefore(date, days) {
  let d = date
  for (let i = 0; i < days; i++) d = dayBefore(d)
  return d
}

/**
 * Everything the Progress page shows. These describe the learner's practice, never their health
 * or intelligence.
 * @param {Client} db
 * @param {{ timezone: string, now?: Date }} opts
 */
export async function getProgressStats(db, { timezone, now = new Date() }) {
  const today = localDate(now, timezone)

  const [words, attempts, activities, due] = await Promise.all([
    db.execute(
      `SELECT w.id, w.slug, w.display_headword, COALESCE(rs.state, 'new') AS state
       FROM featured_ledger f
       JOIN word w ON w.id = f.word_id
       LEFT JOIN review_state rs ON rs.word_id = w.id
       ORDER BY f.first_featured_date, w.id`
    ),
    db.execute('SELECT answered_at, result, rating FROM review_attempt'),
    db.execute('SELECT COUNT(DISTINCT activity_id) AS n FROM activity_attempt'),
    countDue(db, now)
  ])

  /** @type {Record<string, number>} */
  const byState = Object.fromEntries(STATES.map((s) => [s, 0]))
  const garden = words.rows.map((r) => {
    const state = STATES.includes(String(r.state)) ? String(r.state) : 'new'
    byState[state]++
    return { id: Number(r.id), slug: String(r.slug), headword: String(r.display_headword), state }
  })

  const rows = attempts.rows.map((r) => ({
    date: localDate(new Date(String(r.answered_at)), timezone),
    result: String(r.result),
    rating: r.rating === null ? null : String(r.rating)
  }))
  const activeDates = activeDatesFrom(
    attempts.rows.map((r) => String(r.answered_at)),
    timezone
  )

  // Four rolling weeks, oldest first; the last one is the seven days ending today.
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const age = WEEKS - 1 - i
    const end = daysBefore(today, age * 7)
    const start = daysBefore(end, 6)
    const inWeek = rows.filter((r) => r.date >= start && r.date <= end)
    const checked = inWeek.filter((r) => r.result === 'correct' || r.result === 'incorrect')
    const right = checked.filter((r) => r.result === 'correct').length
    const days = [...activeDates].filter((d) => d >= start && d <= end).length
    return {
      label: age === 0 ? 'This week' : age === 1 ? 'Last week' : `${age} weeks ago`,
      start,
      end,
      checked: checked.length,
      accuracy: checked.length ? Math.round((right / checked.length) * 100) : null,
      activeDays: days
    }
  })

  // Self-rated confidence over the last four weeks.
  const windowStart = daysBefore(today, WEEKS * 7 - 1)
  /** @type {Record<string, number>} */
  const ratings = { again: 0, hard: 0, good: 0, easy: 0 }
  for (const r of rows)
    if (r.rating && r.date >= windowStart && r.rating in ratings) ratings[r.rating]++

  // The seven days ending today, for the little consistency strip.
  const strip = Array.from({ length: 7 }, (_, i) => {
    const date = daysBefore(today, 6 - i)
    return { date, active: activeDates.has(date) }
  })

  return {
    today,
    encountered: garden.length,
    byState,
    due,
    streak: computeStreak(activeDates, today),
    reviewsTotal: rows.filter((r) => r.rating).length,
    activitiesTried: Number(activities.rows[0].n),
    weeks,
    ratings,
    strip,
    garden
  }
}
