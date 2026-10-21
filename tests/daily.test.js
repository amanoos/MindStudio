import { describe, it, expect } from 'vitest'
import { testDb, insertWord } from './helpers.js'
import { getOrCreateDailySet } from '../src/lib/server/daily/publish.js'
import { localDate, pickWords } from '../src/lib/server/daily/select.js'

/** @param {import('@libsql/client').Client} db @param {number} n */
async function seed(db, n) {
  const topics = ['science', 'arts', 'work', 'history', 'ideas']
  for (let i = 0; i < n; i++)
    await insertWord(db, `word${String.fromCharCode(97 + i)}x`, { topic: topics[i % 5] })
}

const count = async (/** @type {any} */ db, /** @type {string} */ table) =>
  Number((await db.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n)

const noon = new Date('2026-10-20T12:00:00Z')

describe('localDate', () => {
  it('follows the learner timezone, not the server clock', () => {
    const t = new Date('2026-10-20T23:30:00Z')
    expect(localDate(t, 'UTC')).toBe('2026-10-20')
    expect(localDate(t, 'Asia/Manila')).toBe('2026-10-21')
    expect(localDate(t, 'America/Los_Angeles')).toBe('2026-10-20')
  })
})

describe('pickWords', () => {
  it('rotates topics and is deterministic per seed', () => {
    const pool = Array.from({ length: 15 }, (_, i) => ({ id: i, topic: `t${i % 5}` }))
    const a = pickWords(pool, 5, '2026-10-20')
    expect(new Set(a.map((w) => w.topic)).size).toBe(5)
    expect(pickWords(pool, 5, '2026-10-20')).toEqual(a)
  })
})

describe('getOrCreateDailySet', () => {
  it('returns the same five words on repeated visits the same local date', async () => {
    const db = await testDb()
    await seed(db, 12)
    const first = await getOrCreateDailySet(db, { now: noon })
    const again = await getOrCreateDailySet(db, { now: new Date('2026-10-20T20:00:00Z') })
    expect(first.status).toBe('ready')
    expect(first.words).toHaveLength(5)
    expect(again.words.map((w) => w.id)).toEqual(first.words.map((w) => w.id))
    expect(await count(db, 'daily_set')).toBe(1)
    expect(await count(db, 'featured_ledger')).toBe(5)
  })

  it('creates exactly one set under concurrent requests', async () => {
    const db = await testDb()
    await seed(db, 12)
    const results = await Promise.all(
      Array.from({ length: 10 }, () => getOrCreateDailySet(db, { now: noon }))
    )
    const ids = results.map((r) => r.words.map((w) => w.id).join())
    expect(new Set(ids).size).toBe(1)
    expect(await count(db, 'daily_set')).toBe(1)
    expect(await count(db, 'featured_ledger')).toBe(5)
  })

  it('never repeats a featured word on later days', async () => {
    const db = await testDb()
    await seed(db, 12)
    const day1 = await getOrCreateDailySet(db, { now: noon })
    const day2 = await getOrCreateDailySet(db, { now: new Date('2026-10-21T12:00:00Z') })
    const overlap = day2.words.filter((w) => day1.words.some((x) => x.id === w.id))
    expect(day2.words).toHaveLength(5)
    expect(overlap).toEqual([])
  })

  it('reports low reserve instead of publishing duplicates or a short set', async () => {
    const db = await testDb()
    await seed(db, 12)
    await getOrCreateDailySet(db, { now: noon })
    await getOrCreateDailySet(db, { now: new Date('2026-10-21T12:00:00Z') })
    const day3 = await getOrCreateDailySet(db, { now: new Date('2026-10-22T12:00:00Z') })
    expect(day3.status).toBe('low-reserve')
    expect(day3.words).toEqual([])
    expect(await count(db, 'daily_set')).toBe(2)
  })

  it('ignores words that are not published', async () => {
    const db = await testDb()
    await seed(db, 5)
    await db.execute("UPDATE word SET status = 'draft' WHERE id = 1")
    expect((await getOrCreateDailySet(db, { now: noon })).status).toBe('low-reserve')
  })

  it('keeps history when the timezone changes and uses the new local date afterward', async () => {
    const db = await testDb()
    await seed(db, 12)
    const t = new Date('2026-10-20T23:30:00Z')
    const utc = await getOrCreateDailySet(db, { now: t, timezone: 'UTC' })
    const manila = await getOrCreateDailySet(db, { now: t, timezone: 'Asia/Manila' })
    expect(utc.date).toBe('2026-10-20')
    expect(manila.date).toBe('2026-10-21')
    expect(await count(db, 'daily_set')).toBe(2)
    const ledger = await db.execute('SELECT word_id FROM featured_ledger')
    expect(new Set(ledger.rows.map((r) => r.word_id)).size).toBe(10)
  })
})
