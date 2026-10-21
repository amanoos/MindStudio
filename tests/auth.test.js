import { describe, it, expect } from 'vitest'
import {
  authConfig,
  createRateLimiter,
  safeEqual,
  signSession,
  verifySession
} from '../src/lib/server/auth.js'

const SECRET = 'a-test-secret-of-sufficient-length'

describe('passcode comparison', () => {
  it('matches only identical strings', () => {
    expect(safeEqual('hoot', 'hoot')).toBe(true)
    expect(safeEqual('hoot', 'Hoot')).toBe(false)
    expect(safeEqual('hoot', 'hoot ')).toBe(false)
  })
})

describe('sessions', () => {
  it('accepts a freshly signed token', () => {
    expect(verifySession(SECRET, signSession(SECRET))).toBe(true)
  })

  it('rejects a tampered token, wrong secret, missing token and expired token', () => {
    const token = signSession(SECRET, 1_000)
    expect(verifySession(SECRET, token.replace(/^\d/, '9'), 2_000)).toBe(false)
    expect(verifySession('another-secret-entirely-different', token, 2_000)).toBe(false)
    expect(verifySession(SECRET, undefined)).toBe(false)
    expect(verifySession(SECRET, token, 1_000 + 31 * 86_400_000)).toBe(false)
  })
})

describe('rate limiter', () => {
  it('locks out after max failures and forgets them after the window', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1_000 })
    for (let i = 0; i < 3; i++) limiter.recordFailure('ip', 100)
    expect(limiter.isLimited('ip', 200)).toBe(true)
    expect(limiter.isLimited('ip', 1_200)).toBe(false)
    expect(limiter.isLimited('other', 200)).toBe(false)
  })

  it('clears on reset', () => {
    const limiter = createRateLimiter({ max: 1 })
    limiter.recordFailure('ip')
    limiter.reset('ip')
    expect(limiter.isLimited('ip')).toBe(false)
  })
})

describe('authConfig', () => {
  it('gives dev defaults outside production', () => {
    expect(authConfig({}).passcode).toBeTruthy()
  })

  it('refuses to start in production without secrets', () => {
    expect(() => authConfig({ NODE_ENV: 'production' })).toThrow(/APP_PASSCODE/)
    expect(() => authConfig({ NODE_ENV: 'production', APP_PASSCODE: 'x' })).toThrow(
      /SESSION_SECRET/
    )
    expect(
      authConfig({ NODE_ENV: 'production', APP_PASSCODE: 'x', SESSION_SECRET: SECRET }).passcode
    ).toBe('x')
  })
})
