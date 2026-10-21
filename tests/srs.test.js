import { describe, it, expect } from 'vitest'
import { schedule, LADDER_DAYS } from '../src/lib/server/srs.js'

const now = new Date('2026-10-20T12:00:00Z')
const days = (/** @type {Date} */ d) => (d.getTime() - now.getTime()) / 86_400_000

describe('schedule', () => {
  it('climbs the 1/3/7/14/30-day ladder on repeated Good', () => {
    let step = 0
    const seen = []
    for (let i = 0; i < 5; i++) {
      const r = schedule({ step }, 'good', now)
      seen.push(days(r.dueAt))
      step = r.step
    }
    expect(seen).toEqual(LADDER_DAYS)
    expect(schedule({ step: 4 }, 'good', now).state).toBe('mastered')
  })

  it('Again brings the due date forward to minutes, not days', () => {
    const r = schedule({ step: 3 }, 'again', now)
    expect(r.step).toBe(0)
    expect(days(r.dueAt)).toBeLessThan(1 / 24)
    expect(r.dueAt.getTime()).toBeGreaterThan(now.getTime())
  })

  it('Again on a well-known word flags it as a revisit; on a new one it is just learning', () => {
    expect(schedule({ step: 4 }, 'again', now).state).toBe('revisit')
    expect(schedule({ step: 1 }, 'again', now).state).toBe('learning')
  })

  it('Hard repeats the current interval instead of advancing', () => {
    const r = schedule({ step: 3 }, 'hard', now)
    expect(r.step).toBe(3)
    expect(days(r.dueAt)).toBe(7)
  })

  it('Hard on a brand-new word still schedules the first interval', () => {
    expect(days(schedule({ step: 0 }, 'hard', now).dueAt)).toBe(1)
  })

  it('Easy skips a rung and caps at the top of the ladder', () => {
    expect(schedule({ step: 0 }, 'easy', now).step).toBe(2)
    expect(schedule({ step: 5 }, 'easy', now).step).toBe(5)
    expect(days(schedule({ step: 5 }, 'good', now).dueAt)).toBe(30)
  })

  it('moves through learning, familiar and mastered states', () => {
    expect(schedule({ step: 0 }, 'good', now).state).toBe('learning')
    expect(schedule({ step: 2 }, 'good', now).state).toBe('familiar')
    expect(schedule({ step: 4 }, 'easy', now).state).toBe('mastered')
  })
})
