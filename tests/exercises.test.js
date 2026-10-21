import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { testDb } from './helpers.js'
import { loadWordFiles } from '../src/lib/server/content.js'
import { seedWords } from '../src/lib/server/seed.js'
import {
  saveAttempt,
  listAttempts,
  flagAttempt,
  attemptStats,
  isStoredItem
} from '../src/lib/server/exercises.js'
import { buildBackup, importBackup, validateBackup } from '../src/lib/server/export.js'

const item = () => ({
  before: 'The critic gave the film a ',
  after: ' review.',
  options: [
    { word: 'scathing', note: 'Fits: biting.' },
    { word: 'critical', note: 'Too mild.' },
    { word: 'harsh', note: 'Close.' },
    { word: 'unfavorable', note: 'Too neutral.' }
  ],
  correctIndex: 0,
  reason: 'Scathing carries the tone.'
})

async function seededDb() {
  const db = await testDb()
  await seedWords(db, await loadWordFiles(join(process.cwd(), 'content', 'words')))
  return db
}

describe('exercise attempts', () => {
  it('saves a right and a wrong answer and lists the newest first', async () => {
    const db = await testDb()
    const right = await saveAttempt(db, {
      word: 'scathing',
      item: item(),
      chosenIndex: 0,
      model: 'claude-sonnet-5-5'
    })
    const wrong = await saveAttempt(db, { word: 'scathing', item: item(), chosenIndex: 2 })
    expect(right).toMatchObject({ ok: true, correct: true })
    expect(wrong).toMatchObject({ ok: true, correct: false })

    const list = await listAttempts(db)
    expect(list).toHaveLength(2)
    expect(list[0]).toMatchObject({ chosenIndex: 2, correct: false, model: null, flagged: false })
    expect(list[1]).toMatchObject({ chosenIndex: 0, correct: true, model: 'claude-sonnet-5-5' })
    expect(list[1].item.options[0].word).toBe('scathing')
    expect(await attemptStats(db)).toEqual({ total: 2, correct: 1 })
  })

  it('decides correctness itself rather than trusting the page', async () => {
    const db = await testDb()
    const r = await saveAttempt(db, {
      word: 'x',
      item: item(),
      chosenIndex: 1,
      // @ts-expect-error an extra claim the page might try to make
      correct: true
    })
    expect(r).toMatchObject({ ok: true, correct: false })
  })

  it('refuses bad input and stores nothing', async () => {
    const db = await testDb()
    const bad = [
      { word: '', item: item(), chosenIndex: 0 },
      { word: 'x', item: item(), chosenIndex: 9 },
      { word: 'x', item: item(), chosenIndex: -1 },
      { word: 'x', item: item(), chosenIndex: 1.5 },
      { word: 'x', item: { ...item(), correctIndex: 7 }, chosenIndex: 0 },
      { word: 'x', item: { before: 'a' }, chosenIndex: 0 },
      { word: 'x', item: null, chosenIndex: 0 },
      { word: 'x', item: item(), chosenIndex: 0, type: 'nope' },
      { word: 'x', item: { ...item(), reason: 'y'.repeat(30_000) }, chosenIndex: 0 }
    ]
    for (const b of bad) expect((await saveAttempt(db, b)).ok).toBe(false)
    expect(await listAttempts(db)).toHaveLength(0)
  })

  it('flags and unflags an attempt', async () => {
    const db = await testDb()
    const saved = await saveAttempt(db, { word: 'x', item: item(), chosenIndex: 0 })
    if (!saved.ok) throw new Error('save failed')
    expect(await flagAttempt(db, saved.id, true)).toBe(true)
    expect((await listAttempts(db))[0].flagged).toBe(true)
    expect(await flagAttempt(db, saved.id, false)).toBe(true)
    expect((await listAttempts(db))[0].flagged).toBe(false)
    expect(await flagAttempt(db, 9999, true)).toBe(false)
  })

  it('keeps markup as plain stored text', async () => {
    const db = await testDb()
    const it = item()
    it.reason = '<script>alert(1)</script>'
    await saveAttempt(db, { word: 'x', item: it, chosenIndex: 0 })
    expect((await listAttempts(db))[0].item.reason).toBe('<script>alert(1)</script>')
  })

  it('recognises a stored item', () => {
    expect(isStoredItem(item())).toBe(true)
    expect(isStoredItem({})).toBe(false)
  })
})

describe('backup with exercise attempts', () => {
  it('round-trips attempts, including a typed word that is not in the library', async () => {
    const db = await seededDb()
    await saveAttempt(db, { word: 'zzyzx-typed', item: item(), chosenIndex: 3, flagged: true })
    await saveAttempt(db, {
      word: 'scathing',
      item: item(),
      chosenIndex: 0,
      model: 'claude-haiku-5-5'
    })
    const original = await buildBackup(db, new Date('2026-10-20T12:00:00Z'))
    expect(original.exerciseAttempts).toHaveLength(2)

    const fresh = await seededDb()
    const result = await importBackup(fresh, JSON.parse(JSON.stringify(original)))
    expect(result.exercises).toBe(2)
    expect(await buildBackup(fresh, new Date('2026-10-20T12:00:00Z'))).toEqual(original)
  })

  it('loads an older backup that has no exerciseAttempts', async () => {
    const db = await seededDb()
    const backup = /** @type {any} */ (await buildBackup(db))
    delete backup.exerciseAttempts
    expect(validateBackup(backup)).toEqual([])
    const fresh = await seededDb()
    expect((await importBackup(fresh, backup)).exercises).toBe(0)
  })

  it('replaces attempts on restore instead of merging', async () => {
    const source = await seededDb()
    const backup = await buildBackup(source)
    const other = await seededDb()
    await saveAttempt(other, { word: 'old', item: item(), chosenIndex: 0 })
    await importBackup(other, backup)
    expect(await listAttempts(other)).toHaveLength(0)
  })

  it('rejects a backup whose exerciseAttempts is not a list', async () => {
    const db = await seededDb()
    const backup = /** @type {any} */ (await buildBackup(db))
    backup.exerciseAttempts = 'nope'
    expect(validateBackup(backup).join()).toMatch(/exerciseAttempts/)
  })
})
