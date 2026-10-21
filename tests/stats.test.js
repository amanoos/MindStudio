import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { testDb } from './helpers.js'
import { loadWordFiles } from '../src/lib/server/content.js'
import { seedWords } from '../src/lib/server/seed.js'
import { getOrCreateDailySet } from '../src/lib/server/daily/publish.js'
import { recordRating, recordView } from '../src/lib/server/review.js'
import { getProgressStats } from '../src/lib/server/stats.js'

const day = (/** @type {string} */ d) => new Date(`${d}T12:00:00Z`)

async function setup() {
  const db = await testDb()
  await seedWords(db, await loadWordFiles(join(process.cwd(), 'content', 'words')))
  const set = await getOrCreateDailySet(db, { now: day('2026-10-01'), timezone: 'UTC' })
  return { db, ids: set.words.map((w) => w.id) }
}

describe('progress stats', () => {
  it('is empty and calm for a brand-new learner', async () => {
    const db = await testDb()
    const s = await getProgressStats(db, { timezone: 'UTC', now: day('2026-10-20') })
    expect(s.encountered).toBe(0)
    expect(s.streak).toBe(0)
    expect(s.weeks.map((w) => w.accuracy)).toEqual([null, null, null, null])
    expect(s.garden).toEqual([])
  })

  it('counts words by learning state and builds the garden', async () => {
    const { db, ids } = await setup()
    await recordRating(db, {
      wordId: ids[0],
      rating: 'easy',
      activityType: 'x',
      now: day('2026-10-20')
    })
    await recordRating(db, {
      wordId: ids[1],
      rating: 'again',
      activityType: 'x',
      now: day('2026-10-20')
    })
    const s = await getProgressStats(db, { timezone: 'UTC', now: day('2026-10-20') })
    expect(s.encountered).toBe(5)
    expect(s.byState.learning).toBe(2)
    expect(s.byState.new).toBe(3)
    expect(s.garden).toHaveLength(5)
    expect(s.garden.find((g) => g.id === ids[0])?.state).toBe('learning')
  })

  it('computes accuracy per rolling week, oldest first', async () => {
    const { db, ids } = await setup()
    // Week 4 weeks ago (oldest): 1 of 2 right. This week: 3 of 3 right.
    await recordRating(db, {
      wordId: ids[0],
      rating: 'good',
      activityType: 'choice',
      correct: true,
      now: day('2026-09-25')
    })
    await recordRating(db, {
      wordId: ids[1],
      rating: 'again',
      activityType: 'choice',
      correct: false,
      now: day('2026-09-26')
    })
    for (const [i, d] of ['2026-10-18', '2026-10-19', '2026-10-20'].entries())
      await recordRating(db, {
        wordId: ids[i],
        rating: 'good',
        activityType: 'choice',
        correct: true,
        now: day(d)
      })

    const s = await getProgressStats(db, { timezone: 'UTC', now: day('2026-10-20') })
    expect(s.weeks[0]).toMatchObject({ label: '3 weeks ago', checked: 2, accuracy: 50 })
    expect(s.weeks[3]).toMatchObject({
      label: 'This week',
      checked: 3,
      accuracy: 100,
      activeDays: 3
    })
    expect(s.weeks[1].accuracy).toBeNull()
  })

  it('ignores flashcards and views when judging accuracy, but counts them as active days', async () => {
    const { db, ids } = await setup()
    await recordView(db, ids[0], 'UTC', day('2026-10-20'))
    await recordRating(db, {
      wordId: ids[1],
      rating: 'good',
      activityType: 'flashcard',
      now: day('2026-10-20')
    })
    const s = await getProgressStats(db, { timezone: 'UTC', now: day('2026-10-20') })
    expect(s.weeks[3].accuracy).toBeNull()
    expect(s.weeks[3].activeDays).toBe(1)
    expect(s.reviewsTotal).toBe(1)
  })

  it('tallies self-rated confidence, the streak and the seven-day strip', async () => {
    const { db, ids } = await setup()
    for (const [i, d] of ['2026-10-18', '2026-10-19', '2026-10-20'].entries())
      await recordRating(db, {
        wordId: ids[i],
        rating: i === 0 ? 'hard' : 'good',
        activityType: 'x',
        now: day(d)
      })
    const s = await getProgressStats(db, { timezone: 'UTC', now: day('2026-10-20') })
    expect(s.ratings).toEqual({ again: 0, hard: 1, good: 2, easy: 0 })
    expect(s.streak).toBe(3)
    expect(s.strip).toHaveLength(7)
    expect(s.strip.map((d) => d.active)).toEqual([false, false, false, false, true, true, true])
  })

  it('uses the learner timezone when deciding which day an attempt belongs to', async () => {
    const { db, ids } = await setup()
    await recordRating(db, {
      wordId: ids[0],
      rating: 'good',
      activityType: 'x',
      now: new Date('2026-10-20T23:30:00Z')
    })
    const manila = await getProgressStats(db, {
      timezone: 'Asia/Manila',
      now: new Date('2026-10-21T02:00:00Z')
    })
    expect(manila.strip[6]).toMatchObject({ date: '2026-10-21', active: true })
    const utc = await getProgressStats(db, {
      timezone: 'UTC',
      now: new Date('2026-10-21T02:00:00Z')
    })
    expect(utc.strip[5]).toMatchObject({ date: '2026-10-20', active: true })
  })
})
