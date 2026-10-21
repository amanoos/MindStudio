import { describe, it, expect } from 'vitest'
import { buildQuestion } from '../src/lib/server/questions.js'

/** @param {number} id @param {string} headword @param {string[]} syn */
const word = (id, headword, syn) => ({
  id,
  slug: headword,
  headword,
  content: {
    definition: `Definition of ${headword}.`,
    examples: [{ text: `She was ${headword} about it, truly.`, kind: 'everyday' }],
    synonyms: syn.map((w) => ({ word: w, distinction: `${w} differs in tone.` }))
  }
})

const pool = [
  word(1, 'sanguine', ['hopeful', 'upbeat', 'buoyant']),
  word(2, 'equivocal', ['ambiguous', 'evasive', 'vague']),
  word(3, 'palimpsest', ['patchwork', 'composite', 'layered']),
  word(4, 'intransigent', ['obstinate', 'adamant', 'inflexible']),
  word(5, 'perspicacious', ['astute', 'shrewd', 'discerning'])
]
const seeded = () => {
  let a = 7
  return () => ((a = (a * 16807) % 2147483647) - 1) / 2147483646
}

describe('buildQuestion', () => {
  it('builds a choice question whose answer is the target word', () => {
    const q = buildQuestion(pool[0], pool, { type: 'choice', rand: seeded() })
    expect(q.type).toBe('choice')
    if (q.type !== 'choice') return
    expect(q.options).toHaveLength(4)
    expect(q.options[q.answerIndex]).toBe('sanguine')
    expect(new Set(q.options).size).toBe(4)
  })

  it('builds a fill-in-the-blank that hides the word and accepts it', () => {
    const q = buildQuestion(pool[1], pool, { type: 'fill' })
    expect(q.type).toBe('fill')
    if (q.type !== 'fill') return
    expect(q.sentence).toContain('_____')
    expect(q.sentence.toLowerCase()).not.toContain('equivocal')
    expect(q.accept).toContain('equivocal')
  })

  it('builds a synonym question with the right synonym and distractors from other words', () => {
    const q = buildQuestion(pool[2], pool, { type: 'synonym', rand: seeded() })
    expect(q.type).toBe('synonym')
    if (q.type !== 'synonym') return
    expect(['patchwork', 'composite', 'layered']).toContain(q.options[q.answerIndex])
    const others = new Set(['patchwork', 'composite', 'layered'])
    expect(q.options.filter((/** @type {string} */ o) => !others.has(o))).toHaveLength(3)
  })

  it('falls back to a flashcard when there are too few other words for distractors', () => {
    const q = buildQuestion(pool[0], pool.slice(0, 2), { type: 'choice' })
    expect(q.type).toBe('flashcard')
  })

  it('always carries an explanation and the word id', () => {
    const q = buildQuestion(pool[3], pool)
    expect(q.wordId).toBe(4)
    expect(q.explain.definition).toMatch(/intransigent/)
  })
})
