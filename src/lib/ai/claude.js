// A small fetch wrapper for Anthropic's Messages API, called straight from the browser.
// Verified request shape: docs/CLAUDE-API-NOTES.md. Imports nothing from the server.

export const API_URL = 'https://api.anthropic.com/v1/messages'

export const MODELS = [
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', note: 'Balanced (default)' },
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5', note: 'Fastest and cheapest' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5', note: 'More careful, costs more' },
  { id: 'claude-fable-5-1', label: 'Fable 5.1', note: 'Most capable, costs the most' }
]
export const DEFAULT_MODEL = 'claude-sonnet-5-5'

/** @typedef {'no-key' | 'auth' | 'billing' | 'permission' | 'not-found' | 'rate-limit' | 'overloaded' | 'server' | 'network' | 'timeout' | 'refused' | 'malformed' | 'bad-request'} ClaudeErrorKind */

/** @type {Record<ClaudeErrorKind, string>} */
const FRIENDLY = {
  'no-key': 'Add your Claude key first.',
  auth: 'Claude did not accept this key. Check it, or paste a new one.',
  billing: 'There is a billing problem on your Anthropic account.',
  permission: 'This key is not allowed to use that model. Try another model in settings.',
  'not-found': 'Claude could not find that model. Pick another one in settings.',
  'rate-limit': 'Claude says to slow down (or a spend limit was reached). Try again in a minute.',
  overloaded: 'Claude is busy right now. Try again in a moment.',
  server: 'Claude had a hiccup. Try again.',
  network: 'Could not reach Claude. Check your connection and try again.',
  timeout: 'Claude took too long. Try again.',
  refused: 'Claude declined to write that one. Try a different word.',
  malformed: 'Claude sent something unexpected. Try again.',
  'bad-request': 'Claude could not process that request.'
}

export class ClaudeError extends Error {
  /** @param {ClaudeErrorKind} kind @param {string} [detail] a message from the API, never the key */
  constructor(kind, detail) {
    super(FRIENDLY[kind])
    this.name = 'ClaudeError'
    this.kind = kind
    this.detail = detail
  }
}

/** @param {number} status @returns {ClaudeErrorKind} */
function kindForStatus(status) {
  if (status === 401) return 'auth'
  if (status === 402) return 'billing'
  if (status === 403) return 'permission'
  if (status === 404) return 'not-found'
  if (status === 429) return 'rate-limit'
  if (status === 529) return 'overloaded'
  if (status === 504) return 'timeout'
  if (status >= 500) return 'server'
  return 'bad-request'
}

/**
 * Ask Claude for one reply.
 * With `schema`, the reply is constrained to that JSON schema and returned parsed; without it, the
 * plain text is returned.
 * @param {{
 *   apiKey: string | null, model?: string, system?: string, user: string,
 *   schema?: object, maxTokens?: number, timeoutMs?: number,
 *   fetchImpl?: typeof fetch, sleep?: (ms: number) => Promise<void>
 * }} req
 * @returns {Promise<any>}
 */
export async function callClaude(req) {
  const {
    apiKey,
    model = DEFAULT_MODEL,
    system,
    user,
    schema,
    timeoutMs = 60_000,
    fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  } = req
  if (!apiKey) throw new ClaudeError('no-key')

  let maxTokens = req.maxTokens ?? (schema ? 3000 : 64)
  let retriedBusy = false
  let retriedTokens = false

  for (;;) {
    /** @type {Record<string, any>} */
    const body = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: user }],
      output_config: { effort: 'low' }
    }
    if (system) body.system = system
    if (schema) body.output_config.format = { type: 'json_schema', schema }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let res
    try {
      res = await fetchImpl(API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body)
      })
    } catch (e) {
      throw new ClaudeError(/** @type {any} */ (e)?.name === 'AbortError' ? 'timeout' : 'network')
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      const kind = kindForStatus(res.status)
      if ((kind === 'rate-limit' || kind === 'overloaded') && !retriedBusy) {
        retriedBusy = true
        const wait = Number(res.headers?.get?.('retry-after'))
        await sleep(Number.isFinite(wait) && wait > 0 ? Math.min(wait, 10) * 1000 : 1500)
        continue
      }
      /** @type {string | undefined} */
      let detail
      try {
        detail = (await res.json())?.error?.message
      } catch {
        // no readable body
      }
      throw new ClaudeError(kind, detail)
    }

    /** @type {any} */
    let data
    try {
      data = await res.json()
    } catch {
      throw new ClaudeError('malformed')
    }

    if (data?.stop_reason === 'refusal') throw new ClaudeError('refused')
    if (data?.stop_reason === 'max_tokens') {
      if (retriedTokens) throw new ClaudeError('malformed', 'The reply was cut off.')
      retriedTokens = true
      maxTokens *= 2
      continue
    }

    const block = Array.isArray(data?.content)
      ? data.content.find((/** @type {any} */ b) => b?.type === 'text')
      : null
    if (typeof block?.text !== 'string') throw new ClaudeError('malformed')
    if (!schema) return block.text
    try {
      return JSON.parse(block.text)
    } catch {
      throw new ClaudeError('malformed')
    }
  }
}

/**
 * One tiny request, to check that the key and model work.
 * @param {{ apiKey: string | null, model?: string, fetchImpl?: typeof fetch }} opts
 * @returns {Promise<void>}
 */
export async function testConnection(opts) {
  await callClaude({ ...opts, user: 'Reply with the single word: ready', maxTokens: 64 })
}
