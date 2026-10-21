// An optional second opinion: a separate request shows Claude the passage and the choices (without
// the intended answer) and asks which choices a careful editor would accept as equally good. An
// item passes only when that is exactly the intended best word. Off by default because it doubles
// the cost of each exercise.

import { callClaude } from './claude.js'

export const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['best_index', 'equally_good'],
  properties: {
    best_index: { type: 'integer' },
    equally_good: { type: 'array', items: { type: 'integer' } }
  }
}

const SYSTEM = [
  'You are a careful copy editor checking a vocabulary exercise.',
  'You will see a passage with one blank (shown as _____) and a numbered list of words.',
  'Say which single word fits best (best_index, the number from the list). Then list every word a',
  'careful editor would accept as equally good in that blank, including the best one (equally_good).',
  'Judge connotation, register, collocation and context. Use only the schema.'
].join(' ')

/**
 * @param {import('./nuance-item.js').NuanceItem} item
 * @param {{ apiKey: string | null, model?: string, fetchImpl?: typeof fetch, sleep?: (ms: number) => Promise<void> }} deps
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function verifyItem(item, deps) {
  const list = item.options.map((o, i) => `${i}: ${o.word}`).join('\n')
  const raw = await callClaude({
    ...deps,
    system: SYSTEM,
    user: `Passage: ${item.before}_____${item.after}\n\nWords:\n${list}`,
    schema: VERIFY_SCHEMA
  })
  const best = raw?.best_index
  const same = Array.isArray(raw?.equally_good)
    ? [...new Set(raw.equally_good.filter((/** @type {unknown} */ n) => Number.isInteger(n)))]
    : null
  if (!Number.isInteger(best) || !same) return { ok: false, reason: 'unreadable' }
  if (best !== item.correctIndex) return { ok: false, reason: 'different best word' }
  if (same.length !== 1 || same[0] !== item.correctIndex) return { ok: false, reason: 'ambiguous' }
  return { ok: true }
}
