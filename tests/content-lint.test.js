import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { validateWord, lintWords, loadWordFiles } from '../src/lib/server/content.js'
import { testDb } from './helpers.js'
import { seedWords } from '../src/lib/server/seed.js'

const src = (name = 'x.json') => name
const good = () => ({
  headword: 'lucid',
  pos: ['adjective'],
  pronunciation: 'LOO-sid',
  topic: 'everyday precision',
  difficulty: 1,
  definition: 'Clear and easy to understand.',
  register: 'Neutral.',
  nuance: 'Clear in expression, or clear-minded.',
  synonyms: [
    { word: 'clear', distinction: 'plainer' },
    { word: 'coherent', distinction: 'logically connected' },
    { word: 'transparent', distinction: 'nothing hidden' }
  ],
  examples: [
    { text: 'A lucid explanation.', kind: 'everyday' },
    { text: 'Lucid, even in her final days, she corrected the doctor.', kind: 'rich' }
  ],
  etymology: {
    summary: 'From Latin lucidus, bright.',
    confidence: 'sourced',
    sources: [{ name: 'Wiktionary', url: 'https://en.wiktionary.org/wiki/lucid' }]
  },
  currentUsage: 'Common in writing.',
  memoryHook: 'Luc- means light.',
  practice: { prompt: 'Explain something lucidly.' },
  sources: [{ name: 'Wiktionary', url: 'https://en.wiktionary.org/wiki/lucid' }]
})

describe('content linter', () => {
  it('accepts a complete entry', () => {
    expect(validateWord(good())).toEqual([])
  })

  it('rejects an etymology with no source', () => {
    const w = good()
    w.etymology.sources = []
    expect(validateWord(w).join()).toMatch(/etymology.sources/)
  })

  it('rejects a source URL that is not http(s)', () => {
    const w = good()
    w.sources[0].url = 'javascript:alert(1)'
    expect(validateWord(w).join()).toMatch(/url must be http/)
  })

  it('requires sources for historical notes', () => {
    const w = { ...good(), historicalNotes: 'First recorded in 1612.' }
    expect(validateWord(w).join()).toMatch(/historicalSources/)
  })

  it('requires an unknown confidence value to be sourced or uncertain', () => {
    const w = good()
    w.etymology.confidence = 'verified'
    expect(validateWord(w).join()).toMatch(/confidence/)
  })

  it('needs 3-8 synonyms and two examples (one everyday, one rich)', () => {
    const w = good()
    w.synonyms = w.synonyms.slice(0, 2)
    w.examples = [w.examples[0], w.examples[0]]
    const msg = validateWord(w).join()
    expect(msg).toMatch(/synonyms/)
    expect(msg).toMatch(/everyday and one rich/)
  })

  it('flags blocked terms as whole words only', () => {
    const w = good()
    w.definition = 'Spice is nice.'
    expect(validateWord(w, ['spic'])).toEqual([])
    w.definition = 'A spic.'
    expect(validateWord(w, ['spic']).join()).toMatch(/blocked/)
  })

  it('detects duplicate normalized headwords across files', () => {
    const a = good()
    const b = { ...good(), headword: 'Lucids' }
    const errors = lintWords([
      { file: src('a.json'), word: a },
      { file: src('b.json'), word: b }
    ])
    expect(errors.join()).toMatch(/duplicates/)
  })

  it('passes for every shipped content file', async () => {
    const entries = await loadWordFiles(join(process.cwd(), 'content', 'words'))
    expect(lintWords(entries)).toEqual([])
  })
})

describe('seeding', () => {
  it('is idempotent and never creates duplicates', async () => {
    const db = await testDb()
    const entries = await loadWordFiles(join(process.cwd(), 'content', 'words'))
    const first = await seedWords(db, entries)
    const second = await seedWords(db, entries)
    expect(first.inserted).toBe(entries.length)
    expect(second).toEqual({ inserted: 0, updated: entries.length })
    const count = await db.execute('SELECT COUNT(*) AS n FROM word')
    expect(Number(count.rows[0].n)).toBe(entries.length)
    const sources = await db.execute('SELECT COUNT(*) AS n FROM word_source')
    expect(Number(sources.rows[0].n)).toBeGreaterThan(entries.length)
  })
})
