import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { testDb } from './helpers.js'
import { loadWordFiles } from '../src/lib/server/content.js'
import { seedWords } from '../src/lib/server/seed.js'
import { getOrCreateDailySet } from '../src/lib/server/daily/publish.js'
import { listNuanceWords } from '../src/lib/server/nuance-words.js'
import { pickOptions, checkTypedWord } from '../src/lib/ai/word-input.js'
import { buildNuancePrompt } from '../src/lib/ai/nuance-prompt.js'

describe('listNuanceWords', () => {
  it('lists nothing before any word has been featured', async () => {
    const db = await testDb()
    await seedWords(db, await loadWordFiles(join(process.cwd(), 'content', 'words')))
    expect(await listNuanceWords(db)).toEqual([])
  })

  it('lists only words already featured, alphabetically, with their related words', async () => {
    const db = await testDb()
    await seedWords(db, await loadWordFiles(join(process.cwd(), 'content', 'words')))
    const day = await getOrCreateDailySet(db, {
      now: new Date('2026-10-20T12:00:00Z'),
      timezone: 'UTC'
    })
    const words = await listNuanceWords(db)
    expect(words).toHaveLength(5)
    expect(words.map((w) => w.headword).sort()).toEqual(day.words.map((w) => w.headword).sort())
    const names = words.map((w) => w.headword.toLowerCase())
    expect(names).toEqual([...names].sort())
    for (const w of words) {
      expect(w.slug).toBeTruthy()
      expect(w.related.length).toBeGreaterThanOrEqual(3)
      expect(w.related.every((r) => typeof r === 'string' && r.length > 0)).toBe(true)
    }
  })
})

describe('pickOptions', () => {
  const related = ['astute', 'discerning', 'shrewd', 'insightful', 'observant']

  it('leaves room for the target word', () => {
    expect(pickOptions(related, 4)).toHaveLength(3)
    expect(pickOptions(related, 5)).toHaveLength(4)
    expect(pickOptions(related, 6)).toHaveLength(5)
  })

  it('clamps the number wanted and uses what exists', () => {
    expect(pickOptions(related, 99)).toHaveLength(5)
    expect(pickOptions(related, 1)).toHaveLength(3)
    expect(pickOptions(['a', 'b'], 6)).toEqual(expect.arrayContaining(['a', 'b']))
    expect(pickOptions([], 4)).toEqual([])
  })

  it('picks different subsets and never repeats or invents a word', () => {
    const seen = new Set()
    for (let i = 0; i < 30; i++) {
      const picked = pickOptions([...related, 'astute'], 4)
      expect(new Set(picked).size).toBe(picked.length)
      for (const p of picked) expect(related).toContain(p)
      seen.add(picked.join())
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('checkTypedWord', () => {
  it.each([
    ['  scathing ', 'scathing'],
    ['well-known', 'well-known'],
    ['ice  cream', 'ice cream'],
    ["rock 'n' roll", "rock 'n' roll"],
    ['café', 'café'],
    ['Ünder', 'Ünder']
  ])('accepts %j', (input, word) => {
    expect(checkTypedWord(input)).toEqual({ ok: true, word })
  })

  it.each(['', ' ', 'a', '1234', 'two<three', 'a'.repeat(41), '-word', 'word-', 'x; DROP TABLE'])(
    'rejects %j',
    (input) => {
      expect(checkTypedWord(input).ok).toBe(false)
    }
  )

  it('rejects non-strings gracefully', () => {
    expect(checkTypedWord(null).ok).toBe(false)
    expect(checkTypedWord(undefined).ok).toBe(false)
  })
})

describe('library words feed the prompt', () => {
  it('offers the stored related words and asks for the rest only if short', () => {
    const p = buildNuancePrompt({
      word: 'perspicacious',
      options: ['astute', 'shrewd'],
      choices: 4
    })
    expect(p.user).toContain('astute, shrewd')
    expect(p.user).toContain('add near-synonyms')
  })
})
