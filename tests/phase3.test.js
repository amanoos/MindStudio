import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { testDb } from './helpers.js'
import { loadWordFiles } from '../src/lib/server/content.js'
import { seedWords } from '../src/lib/server/seed.js'
import { getOrCreateDailySet } from '../src/lib/server/daily/publish.js'
import { saveNote, setFavorite } from '../src/lib/server/notes.js'
import { markRevisit, recordRating, recordView } from '../src/lib/server/review.js'
import { reportIssue } from '../src/lib/server/issues.js'
import { searchWordbook, listFeaturedTopics } from '../src/lib/server/wordbook.js'
import {
  getSettings,
  getTimezone,
  isValidTimezone,
  saveSettings
} from '../src/lib/server/settings.js'
import {
  buildBackup,
  buildWordbookRows,
  importBackup,
  toCsv,
  validateBackup
} from '../src/lib/server/export.js'

const noon = new Date('2026-10-20T12:00:00Z')

async function seededDb() {
  const db = await testDb()
  await seedWords(db, await loadWordFiles(join(process.cwd(), 'content', 'words')))
  return db
}

/** A database with some real learning history in it. */
async function usedDb() {
  const db = await seededDb()
  const day1 = await getOrCreateDailySet(db, { now: noon, timezone: 'UTC' })
  const day2 = await getOrCreateDailySet(db, {
    now: new Date('2026-10-21T12:00:00Z'),
    timezone: 'UTC'
  })
  const [a, b, c] = day1.words
  await recordView(db, a.id, 'UTC', noon)
  await recordRating(db, {
    wordId: a.id,
    rating: 'good',
    activityType: 'choice',
    correct: true,
    now: noon
  })
  await recordRating(db, {
    wordId: b.id,
    rating: 'again',
    activityType: 'fill',
    correct: false,
    now: noon
  })
  await markRevisit(db, c.id, noon)
  await saveNote(db, a.id, {
    note: 'Used it, today: "quoted" text\nsecond line',
    tags: 'work, formal'
  })
  await setFavorite(db, b.id, true)
  await reportIssue(db, a.id, 'etymology', 'Looks fine to me')
  await saveSettings(db, { timezone: 'Asia/Manila', sessionLength: 15 })
  return { db, day1, day2 }
}

describe('settings', () => {
  it('falls back to defaults, then remembers what was saved', async () => {
    const db = await testDb()
    expect((await getSettings(db)).sessionLength).toBe(10)
    await saveSettings(db, { timezone: 'Asia/Manila', sessionLength: 15 })
    expect(await getSettings(db)).toEqual({ timezone: 'Asia/Manila', sessionLength: 15 })
    expect(await getTimezone(db)).toBe('Asia/Manila')
  })

  it('rejects an unknown timezone or session length without changing anything', async () => {
    const db = await testDb()
    await expect(saveSettings(db, { timezone: 'Mars/Olympus', sessionLength: 10 })).rejects.toThrow(
      /timezone/
    )
    await expect(saveSettings(db, { timezone: 'UTC', sessionLength: 7 })).rejects.toThrow(/session/)
    expect(isValidTimezone('Europe/London')).toBe(true)
    expect((await getSettings(db)).timezone).toBe('UTC')
  })

  it('changing timezone leaves earlier history intact and uses the new local date', async () => {
    const db = await seededDb()
    const t = new Date('2026-10-20T23:30:00Z')
    const before = await getOrCreateDailySet(db, { now: t, timezone: 'UTC' })
    await saveSettings(db, { timezone: 'Asia/Manila', sessionLength: 10 })
    const after = await getOrCreateDailySet(db, { now: t, timezone: await getTimezone(db) })
    expect(before.date).toBe('2026-10-20')
    expect(after.date).toBe('2026-10-21')
    const sets = await db.execute('SELECT local_date FROM daily_set ORDER BY local_date')
    expect(sets.rows.map((r) => r.local_date)).toEqual(['2026-10-20', '2026-10-21'])
  })
})

describe('wordbook search', () => {
  it('lists only featured words, newest first, and filters by text, topic, state and favorites', async () => {
    const { db, day1 } = await usedDb()
    const all = await searchWordbook(db)
    expect(all).toHaveLength(10)
    expect(all[0].firstFeatured).toBe('2026-10-21')

    const first = day1.words[0]
    const byName = await searchWordbook(db, { q: first.headword.slice(0, 5) })
    expect(byName.map((w) => w.headword)).toContain(first.headword)

    const byNote = await searchWordbook(db, { q: 'second line' })
    expect(byNote.map((w) => w.id)).toEqual([first.id])
    expect((await searchWordbook(db, { tag: 'formal' })).map((w) => w.id)).toEqual([first.id])

    const favs = await searchWordbook(db, { favorites: true })
    expect(favs.map((w) => w.id)).toEqual([day1.words[1].id])

    const topic = all[0].topic
    expect((await searchWordbook(db, { topic })).every((w) => w.topic === topic)).toBe(true)
    expect((await searchWordbook(db, { state: 'learning' })).length).toBeGreaterThan(0)
    expect((await searchWordbook(db, { state: 'new' })).length).toBeGreaterThan(0)
    expect(await searchWordbook(db, { from: '2026-10-21' })).toHaveLength(5)
    expect(await searchWordbook(db, { to: '2026-10-20' })).toHaveLength(5)
    expect((await listFeaturedTopics(db)).length).toBeGreaterThan(0)
  })

  it('treats search text literally, including wildcard characters', async () => {
    const { db } = await usedDb()
    expect(await searchWordbook(db, { q: '%' })).toHaveLength(0)
    expect(await searchWordbook(db, { q: '_' })).toHaveLength(0)
  })

  it('sorts alphabetically on request', async () => {
    const { db } = await usedDb()
    const names = (await searchWordbook(db, { sort: 'az' })).map((w) => w.headword.toLowerCase())
    expect(names).toEqual([...names].sort())
  })

  it('never lists words that have not been featured', async () => {
    const db = await seededDb()
    expect(await searchWordbook(db)).toHaveLength(0)
  })
})

describe('backup and restore', () => {
  it('round-trips: export, restore into a fresh seeded database, export again, identical', async () => {
    const { db } = await usedDb()
    const original = await buildBackup(db, noon)

    const fresh = await seededDb()
    const result = await importBackup(fresh, JSON.parse(JSON.stringify(original)))
    expect(result.skippedUnknown).toBe(0)

    const restored = await buildBackup(fresh, noon)
    expect(restored).toEqual(original)
  })

  it('restores learning state so the next review and daily set behave as before', async () => {
    const { db } = await usedDb()
    const backup = await buildBackup(db, noon)
    const fresh = await seededDb()
    await importBackup(fresh, backup)

    const ledger = await fresh.execute('SELECT COUNT(*) AS n FROM featured_ledger')
    expect(Number(ledger.rows[0].n)).toBe(10)
    // Restored history means no already-featured word can be chosen again.
    const next = await getOrCreateDailySet(fresh, {
      now: new Date('2026-10-22T12:00:00Z'),
      timezone: 'UTC'
    })
    const seen = new Set(backup.ledger.map((l) => l.word))
    expect(next.words).toHaveLength(5)
    const keys = await fresh.execute({
      sql: `SELECT normalized_headword FROM word WHERE id IN (${next.words.map(() => '?').join(',')})`,
      args: next.words.map((w) => w.id)
    })
    expect(keys.rows.some((r) => seen.has(String(r.normalized_headword)))).toBe(false)
  })

  it('replaces existing progress instead of merging with it', async () => {
    const { db } = await usedDb()
    const backup = await buildBackup(db, noon)
    const other = await seededDb()
    await getOrCreateDailySet(other, { now: new Date('2026-12-01T12:00:00Z'), timezone: 'UTC' })
    await importBackup(other, backup)
    const sets = await other.execute('SELECT local_date FROM daily_set ORDER BY local_date')
    expect(sets.rows.map((r) => r.local_date)).toEqual(['2026-10-20', '2026-10-21'])
  })

  it('skips words the app does not know and reports how many', async () => {
    const { db } = await usedDb()
    const backup = await buildBackup(db, noon)
    backup.ledger.push({ word: 'notarealwordxyz', date: '2026-10-22' })
    const fresh = await seededDb()
    expect((await importBackup(fresh, backup)).skippedUnknown).toBe(1)
  })

  it('is all or nothing: a broken file leaves current progress untouched', async () => {
    const { db } = await usedDb()
    const before = await buildBackup(db, noon)
    const bad = /** @type {any} */ ({
      ...before,
      dailySets: [
        { date: '2026-10-20', timezone: 'UTC', words: [] },
        { date: '2026-10-20', timezone: 'UTC', words: [] }
      ]
    })
    await expect(importBackup(db, bad)).rejects.toThrow()
    expect(await buildBackup(db, noon)).toEqual(before)
  })

  it('rejects files that are not backups', () => {
    expect(validateBackup(null)).not.toEqual([])
    expect(validateBackup({ format: 'something-else' })).not.toEqual([])
    expect(validateBackup({ format: 'mind-studio-backup', version: 99 }).join()).toMatch(/version/)
  })

  it('does not back up internal settings', async () => {
    const { db } = await usedDb()
    await db.execute("INSERT INTO setting (key, value) VALUES ('content_hash', 'abc')")
    expect((await buildBackup(db)).settings).not.toHaveProperty('content_hash')
  })
})

describe('wordbook export', () => {
  it('includes headword, content metadata, sources, notes and learning state', async () => {
    const { db, day1 } = await usedDb()
    const rows = await buildWordbookRows(db)
    expect(rows).toHaveLength(10)
    const row = rows.find((r) => r.headword === day1.words[0].headword)
    expect(row).toMatchObject({ learning_state: 'learning', favorite: false, tags: 'work, formal' })
    expect(String(row?.sources)).toMatch(/https:\/\//)
    expect(String(row?.definition).length).toBeGreaterThan(10)
    expect(String(row?.note)).toContain('second line')
  })

  it('writes valid CSV: quotes, commas and newlines survive, and formulas are defused', () => {
    const csv = toCsv(
      [{ headword: 'a,b', definition: 'say "hi"\nthere', note: '=SUM(A1:A9)' }],
      ['headword', 'definition', 'note']
    )
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('"a,b"')
    expect(csv).toContain('"say ""hi""\nthere"')
    expect(csv).toContain("'=SUM(A1:A9)")
  })
})
