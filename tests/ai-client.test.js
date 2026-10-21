import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callClaude, testConnection, ClaudeError, API_URL } from '../src/lib/ai/claude.js'
import {
  saveKey,
  readKey,
  maskedKey,
  removeKey,
  checkKeyShape,
  KEY_NAME
} from '../src/lib/ai/key-store.js'

const KEY = 'sk-ant-api03-secretsecretsecret1234'

/** @param {number} status @param {any} body @param {Record<string, string>} [headers] */
const reply = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (/** @type {string} */ k) => headers[k.toLowerCase()] ?? null },
  json: async () => body
})
const okText = (/** @type {string} */ text, stop = 'end_turn') =>
  reply(200, { stop_reason: stop, content: [{ type: 'text', text }] })

const noSleep = async () => {}

describe('key store', () => {
  /** @type {Record<string, string>} */
  let data
  beforeEach(() => {
    data = {}
    vi.stubGlobal('localStorage', {
      getItem: (/** @type {string} */ k) => data[k] ?? null,
      setItem: (/** @type {string} */ k, /** @type {string} */ v) => {
        data[k] = v
      },
      removeItem: (/** @type {string} */ k) => {
        delete data[k]
      }
    })
  })

  it('saves, masks, reads and removes the key', () => {
    expect(readKey()).toBeNull()
    expect(saveKey(`  ${KEY}  `)).toEqual({ ok: true })
    expect(data[KEY_NAME]).toBe(KEY)
    expect(readKey()).toBe(KEY)
    expect(maskedKey()).toBe('••••1234')
    expect(maskedKey()).not.toContain('secret')
    removeKey()
    expect(readKey()).toBeNull()
    expect(Object.keys(data)).toHaveLength(0)
  })

  it('rejects keys of the wrong shape and stores nothing', () => {
    for (const bad of [
      '',
      'abc',
      'sk-ant- has space inside it',
      'sk-openai-xxxxxxxxxxxxxxxxxxxx'
    ]) {
      expect(checkKeyShape(bad)).toBeTruthy()
      expect(saveKey(bad).ok).toBe(false)
    }
    expect(Object.keys(data)).toHaveLength(0)
  })

  it('survives blocked storage', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('blocked')
      },
      setItem() {
        throw new Error('blocked')
      },
      removeItem() {
        throw new Error('blocked')
      }
    })
    expect(saveKey(KEY).ok).toBe(false)
    expect(readKey()).toBeNull()
    expect(maskedKey()).toBeNull()
    expect(() => removeKey()).not.toThrow()
  })
})

describe('callClaude', () => {
  it('sends the documented headers and body', async () => {
    const f = vi.fn().mockResolvedValue(okText('hello'))
    const out = await callClaude({
      apiKey: KEY,
      model: 'claude-haiku-5-5',
      system: 'sys',
      user: 'hi',
      fetchImpl: f
    })
    expect(out).toBe('hello')
    const [url, init] = f.mock.calls[0]
    expect(url).toBe(API_URL)
    expect(init.method).toBe('POST')
    expect(init.headers['x-api-key']).toBe(KEY)
    expect(init.headers['anthropic-version']).toBe('2023-06-01')
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('claude-haiku-5-5')
    expect(body.system).toBe('sys')
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }])
    expect(body.output_config.effort).toBe('low')
    expect(body.tool_choice).toBeUndefined()
    expect(init.body).not.toContain(KEY)
  })

  it('asks for a JSON schema and returns the parsed object', async () => {
    const schema = { type: 'object', properties: { a: { type: 'string' } } }
    const f = vi.fn().mockResolvedValue(okText('{"a":"x"}'))
    const out = await callClaude({ apiKey: KEY, user: 'u', schema, fetchImpl: f })
    expect(out).toEqual({ a: 'x' })
    expect(JSON.parse(f.mock.calls[0][1].body).output_config.format).toEqual({
      type: 'json_schema',
      schema
    })
  })

  it('finds the text block even when a thinking block comes first', async () => {
    const f = vi.fn().mockResolvedValue(
      reply(200, {
        stop_reason: 'end_turn',
        content: [
          { type: 'thinking', thinking: '...' },
          { type: 'text', text: '{"ok":true}' }
        ]
      })
    )
    expect(await callClaude({ apiKey: KEY, user: 'u', schema: {}, fetchImpl: f })).toEqual({
      ok: true
    })
  })

  it('refuses to call without a key', async () => {
    const f = vi.fn()
    await expect(callClaude({ apiKey: null, user: 'u', fetchImpl: f })).rejects.toMatchObject({
      kind: 'no-key'
    })
    expect(f).not.toHaveBeenCalled()
  })

  it.each([
    [401, 'auth'],
    [402, 'billing'],
    [403, 'permission'],
    [404, 'not-found'],
    [400, 'bad-request'],
    [500, 'server'],
    [504, 'timeout']
  ])('maps status %i to %s without retrying', async (status, kind) => {
    const f = vi.fn().mockResolvedValue(reply(status, { error: { message: 'detail' } }))
    const err = await callClaude({ apiKey: KEY, user: 'u', fetchImpl: f, sleep: noSleep }).catch(
      (e) => e
    )
    expect(err).toBeInstanceOf(ClaudeError)
    expect(err.kind).toBe(kind)
    expect(err.detail).toBe('detail')
    expect(f).toHaveBeenCalledTimes(1)
  })

  it.each([429, 529])('retries once on %i then succeeds', async (status) => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(reply(status, {}, { 'retry-after': '2' }))
      .mockResolvedValueOnce(okText('fine'))
    const sleep = vi.fn(noSleep)
    expect(await callClaude({ apiKey: KEY, user: 'u', fetchImpl: f, sleep })).toBe('fine')
    expect(f).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(2000)
  })

  it('gives up after one retry', async () => {
    const f = vi.fn().mockResolvedValue(reply(529, {}))
    const err = await callClaude({ apiKey: KEY, user: 'u', fetchImpl: f, sleep: noSleep }).catch(
      (e) => e
    )
    expect(err.kind).toBe('overloaded')
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('reports a network failure and a timeout', async () => {
    const down = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await callClaude({ apiKey: KEY, user: 'u', fetchImpl: down }).catch((e) => e.kind)).toBe(
      'network'
    )
    const slow = vi.fn(
      (/** @type {string} */ _u, /** @type {RequestInit} */ init) =>
        new Promise((_res, rej) =>
          init.signal?.addEventListener('abort', () =>
            rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          )
        )
    )
    expect(
      await callClaude({
        apiKey: KEY,
        user: 'u',
        timeoutMs: 10,
        fetchImpl: /** @type {any} */ (slow)
      }).catch((e) => e.kind)
    ).toBe('timeout')
  })

  it('treats a refusal as a refusal and never parses it', async () => {
    const f = vi.fn().mockResolvedValue(okText('{"a":1}', 'refusal'))
    expect(
      await callClaude({ apiKey: KEY, user: 'u', schema: {}, fetchImpl: f }).catch((e) => e.kind)
    ).toBe('refused')
  })

  it('retries once with a bigger limit when the answer is cut off', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(okText('{"a"', 'max_tokens'))
      .mockResolvedValueOnce(okText('{"a":1}'))
    const out = await callClaude({
      apiKey: KEY,
      user: 'u',
      schema: {},
      maxTokens: 100,
      fetchImpl: f
    })
    expect(out).toEqual({ a: 1 })
    expect(JSON.parse(f.mock.calls[1][1].body).max_tokens).toBe(200)
  })

  it('flags malformed answers', async () => {
    for (const r of [
      okText('not json'),
      reply(200, { content: [] }),
      reply(200, { stop_reason: 'end_turn', content: [{ type: 'text' }] })
    ]) {
      const f = vi.fn().mockResolvedValue(r)
      expect(
        await callClaude({ apiKey: KEY, user: 'u', schema: {}, fetchImpl: f }).catch((e) => e.kind)
      ).toBe('malformed')
    }
  })

  it('never puts the key in an error', async () => {
    const f = vi.fn().mockResolvedValue(reply(401, { error: { message: 'invalid x-api-key' } }))
    const err = await callClaude({ apiKey: KEY, user: 'u', fetchImpl: f }).catch((e) => e)
    expect(JSON.stringify({ m: err.message, d: err.detail, s: err.stack })).not.toContain(KEY)
  })
})

describe('testConnection', () => {
  it('makes one small request', async () => {
    const f = vi.fn().mockResolvedValue(okText('ready'))
    await testConnection({ apiKey: KEY, fetchImpl: f })
    expect(f).toHaveBeenCalledTimes(1)
    expect(JSON.parse(f.mock.calls[0][1].body).max_tokens).toBeLessThanOrEqual(64)
  })
})
