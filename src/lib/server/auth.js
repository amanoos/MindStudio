import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const DAY_MS = 86_400_000
const SESSION_DAYS = 30

/**
 * Constant-time string comparison (hashes first so lengths never leak).
 * @param {string} a
 * @param {string} b
 */
export function safeEqual(a, b) {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/**
 * @param {string} secret
 * @param {string} body
 */
const mac = (secret, body) => createHmac('sha256', secret).update(body).digest('hex')

/**
 * Session token: "<expiry-ms>.<hmac>". No server-side session store needed.
 * @param {string} secret
 * @param {number} [now]
 */
export function signSession(secret, now = Date.now()) {
  const body = String(now + SESSION_DAYS * DAY_MS)
  return `${body}.${mac(secret, body)}`
}

/**
 * @param {string} secret
 * @param {string | undefined} token
 * @param {number} [now]
 */
export function verifySession(secret, token, now = Date.now()) {
  if (!token) return false
  const [body, sig] = token.split('.')
  if (!body || !sig) return false
  if (!safeEqual(sig, mac(secret, body))) return false
  return Number(body) > now
}

/**
 * In-memory failed-attempt limiter (single process is enough for one learner).
 * @param {{ max?: number, windowMs?: number }} [opts]
 */
export function createRateLimiter({ max = 5, windowMs = 15 * 60_000 } = {}) {
  /** @type {Map<string, number[]>} */
  const failures = new Map()
  /** @param {string} key @param {number} now */
  const recent = (key, now) => (failures.get(key) ?? []).filter((t) => now - t < windowMs)
  return {
    /** @param {string} key @param {number} [now] */
    isLimited: (key, now = Date.now()) => recent(key, now).length >= max,
    /** @param {string} key @param {number} [now] */
    recordFailure(key, now = Date.now()) {
      failures.set(key, [...recent(key, now), now])
    },
    /** @param {string} key */
    reset: (key) => failures.delete(key)
  }
}

/**
 * Passcode and session secret from the environment. Production refuses to start without them;
 * development gets obvious throwaway defaults.
 * @param {Record<string, string | undefined>} [env]
 */
export function authConfig(env = process.env) {
  const prod = env.NODE_ENV === 'production'
  const passcode = env.APP_PASSCODE ?? (prod ? '' : 'hoot')
  const sessionSecret = env.SESSION_SECRET ?? (prod ? '' : 'dev-only-secret-not-for-production')
  if (prod && !passcode) throw new Error('APP_PASSCODE must be set in production')
  if (prod && sessionSecret.length < 16)
    throw new Error('SESSION_SECRET must be set (16+ characters) in production')
  return { passcode, sessionSecret }
}
