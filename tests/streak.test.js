import { describe, it, expect } from 'vitest'
import { activeDatesFrom, computeStreak, dayBefore } from '../src/lib/server/streak.js'

describe('computeStreak', () => {
  it('counts consecutive days including today', () => {
    const dates = new Set(['2026-10-18', '2026-10-19', '2026-10-20'])
    expect(computeStreak(dates, '2026-10-20')).toBe(3)
  })

  it('keeps yesterday’s streak alive before today’s first activity', () => {
    const dates = new Set(['2026-10-18', '2026-10-19'])
    expect(computeStreak(dates, '2026-10-20')).toBe(2)
  })

  it('is zero after a missed day, and ignores older runs', () => {
    expect(computeStreak(new Set(['2026-10-15', '2026-10-16']), '2026-10-20')).toBe(0)
    expect(computeStreak(new Set(['2026-10-20', '2026-10-18']), '2026-10-20')).toBe(1)
  })

  it('handles month and year boundaries', () => {
    expect(dayBefore('2026-03-01')).toBe('2026-02-28')
    expect(dayBefore('2027-01-01')).toBe('2026-12-31')
  })
})

describe('activeDatesFrom', () => {
  it('buckets timestamps by the learner’s local date', () => {
    const dates = activeDatesFrom(['2026-10-20T23:30:00Z'], 'Asia/Manila')
    expect(dates.has('2026-10-21')).toBe(true)
  })
})
