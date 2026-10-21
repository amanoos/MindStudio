// Ties the prompt, the Claude client and the validator together. This is the one function the
// exercise page calls; another provider could replace it later.

import { callClaude, ClaudeError } from './claude.js'
import { buildNuancePrompt } from './nuance-prompt.js'
import { validateNuanceItem } from './nuance-item.js'
import { verifyItem } from './verify.js'
import { readKey } from './key-store.js'

/**
 * @param {{ word: string, options?: string[], length?: string, difficulty?: string, choices?: number }} input
 * @param {{ apiKey?: string | null, model?: string, fetchImpl?: typeof fetch, rng?: () => number, secondOpinion?: boolean, sleep?: (ms: number) => Promise<void> }} [deps]
 * @returns {Promise<{ ok: true, item: import('./nuance-item.js').NuanceItem } | { ok: false, problem: string, kind: string }>}
 */
export async function generateNuanceItem(input, deps = {}) {
  const { system, user, schema } = buildNuancePrompt(input)
  const apiKey = deps.apiKey === undefined ? readKey() : deps.apiKey
  let problem = 'Claude sent something unexpected. Try again.'

  // One automatic second attempt if the first answer fails validation; transport errors are
  // already retried inside callClaude and are shown as they are.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callClaude({
        apiKey,
        model: deps.model,
        system,
        user,
        schema,
        fetchImpl: deps.fetchImpl,
        sleep: deps.sleep
      })
      const checked = validateNuanceItem(raw, { word: input.word, rng: deps.rng })
      if (!checked.ok) {
        problem = checked.problem
        continue
      }
      if (!deps.secondOpinion) return checked
      const second = await verifyItem(checked.item, {
        apiKey,
        model: deps.model,
        fetchImpl: deps.fetchImpl,
        sleep: deps.sleep
      })
      if (second.ok) return checked
      problem = `a second check disagreed: ${second.reason}.`
    } catch (e) {
      if (e instanceof ClaudeError && e.kind !== 'malformed') {
        return { ok: false, problem: e.message, kind: e.kind }
      }
      problem = e instanceof ClaudeError ? e.message : problem
    }
  }
  return {
    ok: false,
    problem: `That one did not come out right (${problem}) Try again.`,
    kind: 'invalid'
  }
}
