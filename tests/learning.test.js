import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { testDb } from './helpers.js'
import { loadWordFiles } from '../src/lib/server/content.js'
import { seedWords } from '../src/lib/server/seed.js'
import { getOrCreateDailySet } from '../src/lib/server/daily/publish.js'
import { getFeaturedWord, getFeaturedWords } from '../src/lib/server/words.js'
import { parseTags, saveNote, setFavorite } from '../src/lib/server/notes.js'
import {
  countDue,
  getReviewWords,
  markRevisit,
  recordRating,
  recordView
} from '../src/lib/server/review.js'
import { getStreak, getTodayProgress } from '../src/lib/server/progress.js'

const noon = new Date('2026-10-20T12:00:00Z')

async function setup() {
  const db = await testDb()
  await seedWords(db, await loadWordFiles(join(process.cwd(), 'content', 'words')))
  const set = await getOrCreateDailySet(db, { now: noon })
  return { db, set }
}

describe('word access', () => {
  it('only exposes words that have been featured', async () => {
    const { db, set } = await setup()
    expect(await getFeaturedWord(db, set.words[0].slug)).not.toBeNull()
    expect(await getFeaturedWord(db, 'no-such-word')).toBeNull()
    const featured = await getFeaturedWords(db)
    expect(featured).toHaveLength(5)
  })

  it('returns sources and the review state with the word', async () => {
    const { db, set } = await setup()
    const w = await getFeaturedWord(db, set.words[0].slug)
    expect(w?.sources.length).toBeGreaterThan(1)
    expect(w?.review.state).toBe('new')
  })
})

describe('notes and favorites', () => {
  it('normalizes tags', () => {
    expect(parseTags(' Work,  work , Big  Ideas ,,')).toEqual(['work', 'big ideas'])
  })

  it('saves a note and keeps the favorite flag independent', async () => {
    const { db, set } = await setup()
    const { id, slug } = set.words[0]
    await setFavorite(db, id, true)
    await saveNote(db, id, { note: 'Used it in a meeting.', tags: 'work, formal' })
    const w = await getFeaturedWord(db, slug)
    expect(w?.note).toEqual({ text: 'Used it in a meeting.', favorite: true, tags: 'work, formal' })
    await saveNote(db, id, { note: 'Edited.', tags: '' })
    expect((await getFeaturedWord(db, slug))?.note.favorite).toBe(true)
  })
})

describe('review loop', () => {
  it('treats never-reviewed featured words as due, and Good pushes them out a day', async () => {
    const { db, set } = await setup()
    expect(await countDue(db, noon)).toBe(5)
    await recordRating(db, {
      wordId: set.words[0].id,
      rating: 'good',
      activityType: 'choice',
      correct: true,
      now: noon
    })
    expect(await countDue(db, noon)).toBe(4)
    expect(await countDue(db, new Date('2026-10-21T12:00:01Z'))).toBe(5)
    const w = await getFeaturedWord(db, set.words[0].slug)
    expect(w?.review.state).toBe('learning')
    expect(w?.review.step).toBe(1)
  })

  it('brings the due date forward after Again', async () => {
    const { db, set } = await setup()
    const id = set.words[0].id
    await recordRating(db, { wordId: id, rating: 'easy', activityType: 'flashcard', now: noon })
    const later = new Date('2026-10-20T12:30:00Z')
    expect(await countDue(db, later)).toBe(4)
    await recordRating(db, { wordId: id, rating: 'again', activityType: 'flashcard', now: later })
    expect(await countDue(db, new Date('2026-10-20T12:45:00Z'))).toBe(5)
    const attempts = await db.execute('SELECT COUNT(*) AS n FROM review_attempt')
    expect(Number(attempts.rows[0].n)).toBe(2)
  })

  it('never writes to the featured ledger when reviewing', async () => {
    const { db, set } = await setup()
    await recordRating(db, {
      wordId: set.words[0].id,
      rating: 'good',
      activityType: 'choice',
      now: noon
    })
    const ledger = await db.execute('SELECT COUNT(*) AS n FROM featured_ledger')
    expect(Number(ledger.rows[0].n)).toBe(5)
  })

  it('refuses to rate a word that has not been featured or an unknown rating', async () => {
    const { db, set } = await setup()
    await expect(
      recordRating(db, { wordId: 9999, rating: 'good', activityType: 'x', now: noon })
    ).rejects.toThrow(/not been featured/)
    await expect(
      recordRating(db, { wordId: set.words[0].id, rating: 'perfect', activityType: 'x', now: noon })
    ).rejects.toThrow(/Unknown rating/)
  })

  it('filters by favorites, topic and scope', async () => {
    const { db, set } = await setup()
    await setFavorite(db, set.words[1].id, true)
    const favs = await getReviewWords(db, { now: noon, favorites: true })
    expect(favs.map((w) => w.id)).toEqual([set.words[1].id])
    const topic = set.words[0].topic
    const byTopic = await getReviewWords(db, { now: noon, topic })
    expect(byTopic.every((w) => w.topic === topic)).toBe(true)
    await recordRating(db, {
      wordId: set.words[0].id,
      rating: 'good',
      activityType: 'x',
      now: noon
    })
    expect(await getReviewWords(db, { now: noon })).toHaveLength(4)
    expect(
      await getReviewWords(db, { now: noon, scope: 'today', today: '2026-10-20' })
    ).toHaveLength(5)
  })

  it('revisit puts a word back in the queue without re-featuring it', async () => {
    const { db, set } = await setup()
    const id = set.words[0].id
    await recordRating(db, { wordId: id, rating: 'easy', activityType: 'x', now: noon })
    await markRevisit(db, id, new Date('2026-10-20T13:00:00Z'))
    expect(await countDue(db, new Date('2026-10-20T13:00:00Z'))).toBe(5)
    const w = await getFeaturedWord(db, set.words[0].slug)
    expect(w?.review.state).toBe('revisit')
  })
})

describe('progress and streak', () => {
  it('counts a card once per day and tracks today’s progress', async () => {
    const { db, set } = await setup()
    const ids = set.words.map((w) => w.id)
    await recordView(db, ids[0], 'UTC', noon)
    await recordView(db, ids[0], 'UTC', new Date('2026-10-20T15:00:00Z'))
    await recordRating(db, { wordId: ids[1], rating: 'good', activityType: 'x', now: noon })
    expect(await getTodayProgress(db, ids, 'UTC', noon)).toEqual({ done: 2, total: 5 })
    const views = await db.execute(
      "SELECT COUNT(*) AS n FROM review_attempt WHERE activity_type = 'view'"
    )
    expect(Number(views.rows[0].n)).toBe(1)
  })

  it('builds a streak from consecutive active days', async () => {
    const { db, set } = await setup()
    await recordView(db, set.words[0].id, 'UTC', new Date('2026-10-19T09:00:00Z'))
    await recordView(db, set.words[1].id, 'UTC', new Date('2026-10-20T09:00:00Z'))
    expect(await getStreak(db, 'UTC', noon)).toBe(2)
    expect(await getStreak(db, 'UTC', new Date('2026-10-23T09:00:00Z'))).toBe(0)
  })
})
