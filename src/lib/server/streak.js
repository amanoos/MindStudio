import { localDate } from './daily/select.js'

/** @param {string} date YYYY-MM-DD @param {number} days */
function shiftDate(date, days) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The calendar day before a YYYY-MM-DD date. @param {string} date */
export const dayBefore = (date) => shiftDate(date, -1)

/**
 * Consecutive days of activity ending today. If today has no activity yet, a streak that ran up
 * to yesterday still counts, so the number never drops to zero just because the day has begun.
 * @param {Set<string>} activeDates local dates (YYYY-MM-DD) with any learning activity
 * @param {string} today local date
 */
export function computeStreak(activeDates, today) {
  let day = activeDates.has(today) ? today : dayBefore(today)
  let count = 0
  while (activeDates.has(day)) {
    count++
    day = dayBefore(day)
  }
  return count
}

/**
 * @param {string[]} isoTimestamps answered_at values
 * @param {string} timezone
 */
export function activeDatesFrom(isoTimestamps, timezone) {
  return new Set(isoTimestamps.map((t) => localDate(new Date(t), timezone)))
}
