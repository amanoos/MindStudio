import { describe, it, expect, vi } from 'vitest'
import { buildNuancePrompt, NUANCE_SCHEMA } from '../src/lib/ai/nuance-prompt.js'
import { validateNuanceItem } from '../src/lib/ai/nuance-item.js'
import { generateNuanceItem } from '../src/lib/ai/generate.js'

const KEY = 'sk-ant-api03-secretsecretsecret1234'

const good = () => ({
  passage: 'The critic gave the film a _____ review, praising nothing and sparing no one.',
  options: ['scathing', 'critical', 'harsh', 'unfavorable'],
  correct_index: 0,
  reason: 'Scathing carries the biting, merciless tone the sentence sets up.',
  option_notes: [
    'Fits: biting and merciless.',
    'Too mild.',
    'Close, but less cutting.',
    'Too neutral.'
  ]
})

describe('buildNuancePrompt', () => {
  it('uses only the word, synonyms and settings', () => {
    const p = buildNuancePrompt({
      word: 'scathing',
      options: ['harsh', 'critical'],
      length: 'paragraph',
      difficulty: 'tricky',
      choices: 5
    })
    expect(p.user).toContain('Target word: scathing')
    expect(p.user).toContain('harsh, critical')
    expect(p.user).toContain('one paragraph')
    expect(p.user).toContain('tricky')
    expect(p.user).toContain('Total number of options: 5')
    expect(p.user.split('\n')).toHaveLength(5)
    expect(p.schema).toBe(NUANCE_SCHEMA)
  })

  it('ignores unknown fields, clamps settings and tidies the word', () => {
    const p = buildNuancePrompt(
      /** @type {any} */ ({
        word: '  sca\u0000thing\n  ',
        notes: 'my private note',
        length: 'novel',
        difficulty: 'impossible',
        choices: 99
      })
    )
    expect(p.user).not.toContain('private')
    expect(p.user).toContain('Target word: sca thing')
    expect(p.user).toContain('one sentence')
    expect(p.user).toContain('medium')
    expect(p.user).toContain('Total number of options: 6')
    expect(p.user).toContain('choose near-synonyms yourself')
  })

  it('has a strict schema with every property required', () => {
    expect(NUANCE_SCHEMA.additionalProperties).toBe(false)
    expect(NUANCE_SCHEMA.required.sort()).toEqual(Object.keys(NUANCE_SCHEMA.properties).sort())
  })
})

describe('validateNuanceItem', () => {
  it('accepts a good item and splits the passage at the blank', () => {
    const r = validateNuanceItem(good(), { word: 'scathing', rng: () => 0 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.item.before).toBe('The critic gave the film a ')
    expect(r.item.after).toContain('review')
    expect(r.item.options).toHaveLength(4)
    expect(r.item.options[r.item.correctIndex].word).toBe('scathing')
    expect(r.item.options[r.item.correctIndex].note).toContain('Fits')
  })

  it('keeps each note with its word after shuffling', () => {
    const r = validateNuanceItem(good(), { rng: () => 0.7 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const harsh = r.item.options.find((o) => o.word === 'harsh')
    expect(harsh?.note).toBe('Close, but less cutting.')
  })

  it('does not always keep the answer first', () => {
    const positions = new Set()
    for (let i = 0; i < 40; i++) {
      const r = validateNuanceItem(good())
      if (r.ok) positions.add(r.item.correctIndex)
    }
    expect(positions.size).toBeGreaterThan(1)
  })

  const mutate = (/** @type {(g: any) => void} */ fn) => {
    const g = good()
    fn(g)
    return validateNuanceItem(g, { word: 'scathing' })
  }

  it.each([
    ['no blank', (/** @type {any} */ g) => (g.passage = 'No blank here.')],
    ['two blanks', (/** @type {any} */ g) => (g.passage = 'A _____ and a _____ review.')],
    ['too few options', (/** @type {any} */ g) => (g.options = ['a', 'b', 'c'])],
    [
      'too many options',
      (/** @type {any} */ g) => {
        g.options = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
        g.option_notes = g.options
      }
    ],
    [
      'repeated options',
      (/** @type {any} */ g) => (g.options = ['scathing', 'Scathing', 'x', 'y'])
    ],
    ['index out of range', (/** @type {any} */ g) => (g.correct_index = 4)],
    ['negative index', (/** @type {any} */ g) => (g.correct_index = -1)],
    ['fractional index', (/** @type {any} */ g) => (g.correct_index = 1.5)],
    ['missing reason', (/** @type {any} */ g) => (g.reason = '  ')],
    ['too few notes', (/** @type {any} */ g) => (g.option_notes = ['one'])],
    ['an empty note', (/** @type {any} */ g) => (g.option_notes[2] = '')],
    ['target word missing', (/** @type {any} */ g) => (g.options[0] = 'savage')],
    [
      'a choice already in the passage',
      (/** @type {any} */ g) => (g.passage = 'A harsh judge gave a _____ review.')
    ]
  ])('rejects %s', (_name, fn) => {
    const r = mutate(fn)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problem).toBeTruthy()
  })

  it('rejects non-objects', () => {
    for (const v of [null, 'text', 4, [], undefined]) {
      expect(validateNuanceItem(v).ok).toBe(false)
    }
  })

  it('leaves markup as plain text for the page to escape', () => {
    const g = good()
    g.reason = 'Because <script>alert(1)</script> is not a reason.'
    const r = validateNuanceItem(g)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.item.reason).toBe('Because <script>alert(1)</script> is not a reason.')
  })
})

describe('generateNuanceItem', () => {
  const okFetch = (/** @type {any} */ item) =>
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: JSON.stringify(item) }]
      })
    })

  it('returns a validated item and sends the chosen model', async () => {
    const f = okFetch(good())
    const r = await generateNuanceItem(
      { word: 'scathing' },
      { apiKey: KEY, model: 'claude-haiku-5-5', fetchImpl: f }
    )
    expect(r.ok).toBe(true)
    const body = JSON.parse(f.mock.calls[0][1].body)
    expect(body.model).toBe('claude-haiku-5-5')
    expect(body.output_config.format.type).toBe('json_schema')
  })

  it('tries once more when the first item is invalid', async () => {
    const bad = { ...good(), passage: 'No blank.' }
    const f = vi
      .fn()
      .mockResolvedValueOnce(await okFetch(bad)())
      .mockResolvedValueOnce(await okFetch(good())())
    const r = await generateNuanceItem({ word: 'scathing' }, { apiKey: KEY, fetchImpl: f })
    expect(r.ok).toBe(true)
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('gives a friendly problem after two invalid items', async () => {
    const f = okFetch({ ...good(), passage: 'No blank.' })
    const r = await generateNuanceItem({ word: 'scathing' }, { apiKey: KEY, fetchImpl: f })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.kind).toBe('invalid')
      expect(r.problem).toContain('Try again')
    }
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('shows transport problems straight away without a second try', async () => {
    const f = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => null },
      json: async () => ({ error: { message: 'invalid x-api-key' } })
    })
    const r = await generateNuanceItem({ word: 'scathing' }, { apiKey: KEY, fetchImpl: f })
    expect(r).toMatchObject({ ok: false, kind: 'auth' })
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('asks for a key when there is none', async () => {
    const f = vi.fn()
    const r = await generateNuanceItem({ word: 'scathing' }, { apiKey: null, fetchImpl: f })
    expect(r).toMatchObject({ ok: false, kind: 'no-key' })
    expect(f).not.toHaveBeenCalled()
  })
})
