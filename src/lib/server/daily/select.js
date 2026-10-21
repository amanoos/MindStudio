/**
 * Pure helpers for choosing a day's words. No I/O.
 */

/**
 * The calendar date (YYYY-MM-DD) in a given IANA timezone.
 * @param {Date} now
 * @param {string} timezone
 */
export function localDate(now, timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
}

/** @param {string} str */
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Small seeded PRNG so a given date always yields the same shuffle. @param {number} seed */
function mulberry32(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * @template T
 * @param {T[]} list
 * @param {() => number} rand
 */
function shuffled(list, rand) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Pick `count` words, rotating across topics so a set does not feel themed.
 * Deterministic for a given seed (the local date).
 * @template {{ id: number, topic: string }} W
 * @param {W[]} candidates
 * @param {number} count
 * @param {string} seed
 * @returns {W[]}
 */
export function pickWords(candidates, count, seed) {
  const rand = mulberry32(hash(seed))
  /** @type {Map<string, W[]>} */
  const byTopic = new Map()
  for (const w of shuffled(candidates, rand)) {
    byTopic.set(w.topic, [...(byTopic.get(w.topic) ?? []), w])
  }
  const queues = shuffled([...byTopic.values()], rand)
  /** @type {W[]} */
  const picked = []
  while (picked.length < count && queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift()
      if (next && picked.length < count) picked.push(next)
    }
  }
  return picked
}
