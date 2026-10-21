import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyItem, VERIFY_SCHEMA } from '../src/lib/ai/verify.js'
import { generateNuanceItem } from '../src/lib/ai/generate.js'
import { getModel, setModel, getSecondOpinion, setSecondOpinion } from '../src/lib/ai/settings.js'

const KEY = 'sk-ant-api03-secretsecretsecret1234'

const item = () => ({
  before: 'The critic gave the film a ',
  after: ' review.',
  options: [
    { word: 'scathing', note: 'a' },
    { word: 'critical', note: 'b' },
    { word: 'harsh', note: 'c' },
    { word: 'unfavorable', note: 'd' }
  ],
  correctIndex: 0,
  reason: 'r'
})

const modelItem = () => ({
  passage: 'The critic gave the film a _____ review, praising nothing and sparing no one.',
  options: ['scathing', 'gentle', 'mild', 'kind'],
  correct_index: 0,
  reason: 'Scathing is biting.',
  option_notes: ['a', 'b', 'c', 'd']
})

/** @param {any} payload */
const ok = (payload) => ({
  ok: true,
  status: 200,
  headers: { get: () => null },
  json: async () => ({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify(payload) }]
  })
})

describe('verifyItem', () => {
  it('passes when the second reader picks the same single word', async () => {
    const f = vi.fn().mockResolvedValue(ok({ best_index: 0, equally_good: [0] }))
    expect(await verifyItem(item(), { apiKey: KEY, fetchImpl: f })).toEqual({ ok: true })
  })

  it('never shows the intended answer to the second reader', async () => {
    const f = vi.fn().mockResolvedValue(ok({ best_index: 0, equally_good: [0] }))
    await verifyItem(item(), { apiKey: KEY, fetchImpl: f })
    const body = JSON.parse(f.mock.calls[0][1].body)
    expect(body.messages[0].content).toContain('Passage: The critic gave the film a _____ review.')
    expect(body.messages[0].content).not.toMatch(/correct|best word is|answer/i)
    expect(body.output_config.format.schema).toEqual(VERIFY_SCHEMA)
  })

  it.each([
    ['a different best word', { best_index: 2, equally_good: [2] }, 'different best word'],
    ['two equally good words', { best_index: 0, equally_good: [0, 2] }, 'ambiguous'],
    ['an acceptable list without the answer', { best_index: 0, equally_good: [1] }, 'ambiguous'],
    ['a missing list', { best_index: 0 }, 'unreadable'],
    ['a non-integer best', { best_index: 'a', equally_good: [0] }, 'unreadable']
  ])('rejects %s', async (_n, payload, reason) => {
    const f = vi.fn().mockResolvedValue(ok(payload))
    expect(await verifyItem(item(), { apiKey: KEY, fetchImpl: f })).toEqual({ ok: false, reason })
  })

  it('counts a repeated index once', async () => {
    const f = vi.fn().mockResolvedValue(ok({ best_index: 0, equally_good: [0, 0] }))
    expect((await verifyItem(item(), { apiKey: KEY, fetchImpl: f })).ok).toBe(true)
  })
})

describe('generateNuanceItem with a second opinion', () => {
  it('does not make the extra request unless asked', async () => {
    const f = vi.fn().mockResolvedValue(ok(modelItem()))
    const r = await generateNuanceItem({ word: 'scathing' }, { apiKey: KEY, fetchImpl: f })
    expect(r.ok).toBe(true)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('makes a second request and keeps the item when it agrees', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(ok(modelItem()))
      .mockResolvedValueOnce(ok({ best_index: 0, equally_good: [0] }))
    // The generated options are shuffled, so the checker's indices must follow the shuffle.
    const r = await generateNuanceItem(
      { word: 'scathing' },
      { apiKey: KEY, fetchImpl: f, secondOpinion: true, rng: () => 0.999 }
    )
    expect(f).toHaveBeenCalledTimes(2)
    // rng just under 1 leaves the order unchanged, so index 0 is still the answer.
    expect(r.ok).toBe(true)
  })

  it('discards an item the second reader rejects and tries again', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(ok(modelItem()))
      .mockResolvedValueOnce(ok({ best_index: 1, equally_good: [1] }))
      .mockResolvedValueOnce(ok(modelItem()))
      .mockResolvedValueOnce(ok({ best_index: 0, equally_good: [0] }))
    const r = await generateNuanceItem(
      { word: 'scathing' },
      { apiKey: KEY, fetchImpl: f, secondOpinion: true, rng: () => 0.999 }
    )
    expect(r.ok).toBe(true)
    expect(f).toHaveBeenCalledTimes(4)
  })

  it('gives up with a friendly message after two rejections', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(ok(modelItem()))
      .mockResolvedValueOnce(ok({ best_index: 1, equally_good: [1] }))
      .mockResolvedValueOnce(ok(modelItem()))
      .mockResolvedValueOnce(ok({ best_index: 0, equally_good: [0, 1] }))
    const r = await generateNuanceItem(
      { word: 'scathing' },
      { apiKey: KEY, fetchImpl: f, secondOpinion: true, rng: () => 0.999 }
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.kind).toBe('invalid')
      expect(r.problem).toContain('second check')
    }
  })
})

describe('settings', () => {
  /** @type {Record<string, string>} */
  let data
  beforeEach(() => {
    data = {}
    vi.stubGlobal('localStorage', {
      getItem: (/** @type {string} */ k) => data[k] ?? null,
      setItem: (/** @type {string} */ k, /** @type {string} */ v) => {
        data[k] = v
      }
    })
  })

  it('defaults to Sonnet 5.5 and remembers a valid choice only', () => {
    expect(getModel()).toBe('claude-sonnet-5-5')
    setModel('claude-haiku-5-5')
    expect(getModel()).toBe('claude-haiku-5-5')
    setModel('gpt-nonsense')
    expect(getModel()).toBe('claude-haiku-5-5')
    data['mind-studio.claude-model'] = 'tampered'
    expect(getModel()).toBe('claude-sonnet-5-5')
  })

  it('keeps the second opinion off unless switched on', () => {
    expect(getSecondOpinion()).toBe(false)
    setSecondOpinion(true)
    expect(getSecondOpinion()).toBe(true)
    setSecondOpinion(false)
    expect(getSecondOpinion()).toBe(false)
  })

  it('survives blocked storage', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('blocked')
      },
      setItem() {
        throw new Error('blocked')
      }
    })
    expect(getModel()).toBe('claude-sonnet-5-5')
    expect(getSecondOpinion()).toBe(false)
    expect(() => setModel('claude-haiku-5-5')).not.toThrow()
    expect(() => setSecondOpinion(true)).not.toThrow()
  })
})
