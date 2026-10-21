// Validates what the model returned. The page trusts nothing until it has passed through here, and
// every string is shown as plain text (Svelte escapes it), never as HTML.

import { BLANK } from './nuance-prompt.js'

/**
 * @typedef {{
 *   before: string, after: string,
 *   options: { word: string, note: string }[],
 *   correctIndex: number, reason: string
 * }} NuanceItem
 */

/** @param {unknown} v */
const text = (v) => (typeof v === 'string' ? v.trim() : '')

/**
 * @param {unknown} raw the parsed model reply
 * @param {{ word?: string, rng?: () => number }} [ctx] `word` must be among the options; `rng` shuffles
 * @returns {{ ok: true, item: NuanceItem } | { ok: false, problem: string }}
 */
export function validateNuanceItem(raw, ctx = {}) {
  const r = /** @type {Record<string, unknown>} */ (raw && typeof raw === 'object' ? raw : {})
  const passage = text(r.passage)
  const blanks = passage.match(/_{3,}/g) ?? []
  if (blanks.length !== 1) return { ok: false, problem: 'The passage needs exactly one blank.' }

  const words = Array.isArray(r.options) ? r.options.map(text) : []
  if (words.length < 4 || words.length > 6 || words.some((w) => !w || w.length > 60)) {
    return { ok: false, problem: 'There should be four to six choices.' }
  }
  if (new Set(words.map((w) => w.toLowerCase())).size !== words.length) {
    return { ok: false, problem: 'The choices must all be different.' }
  }
  if (ctx.word && !words.some((w) => w.toLowerCase() === ctx.word?.trim().toLowerCase())) {
    return { ok: false, problem: 'The chosen word is missing from the choices.' }
  }

  const index = r.correct_index
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= words.length) {
    return { ok: false, problem: 'The best answer is not one of the choices.' }
  }
  const reason = text(r.reason)
  if (!reason) return { ok: false, problem: 'The reason is missing.' }

  const notes = Array.isArray(r.option_notes) ? r.option_notes.map(text) : []
  if (notes.length !== words.length || notes.some((n) => !n)) {
    return { ok: false, problem: 'Each choice needs a note.' }
  }
  // The answer must not be given away by a choice sitting in the passage already.
  const lowered = passage.toLowerCase()
  if (words.some((w) => new RegExp(`\\b${escapeRegExp(w.toLowerCase())}\\b`).test(lowered))) {
    return { ok: false, problem: 'A choice appears in the passage and gives the answer away.' }
  }

  // Shuffle so the model's ordering (it tends to put the answer first) carries no hint.
  const rng = ctx.rng ?? Math.random
  const order = words.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const [before, after] = splitAtBlank(passage)
  return {
    ok: true,
    item: {
      before,
      after,
      options: order.map((i) => ({ word: words[i], note: notes[i] })),
      correctIndex: order.indexOf(index),
      reason
    }
  }
}

/** @param {string} s */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** @param {string} passage @returns {[string, string]} */
function splitAtBlank(passage) {
  const m = /_{3,}/.exec(passage)
  const at = m?.index ?? 0
  return [passage.slice(0, at), passage.slice(at + (m?.[0].length ?? BLANK.length))]
}
