// Choosing and checking the word for Word Nuance. Pure, so it runs in the browser and in tests.

/**
 * Pick which stored related words to offer, leaving room for the target word itself.
 * @param {string[]} related
 * @param {number} choices total options wanted (4 to 6)
 * @param {() => number} [rng]
 * @returns {string[]}
 */
export function pickOptions(related, choices, rng = Math.random) {
  const want = Math.min(6, Math.max(4, Math.round(choices))) - 1
  const pool = [...new Set(related)]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, want)
}

/**
 * @param {unknown} raw what the learner typed
 * @returns {{ ok: true, word: string } | { ok: false, error: string }}
 */
export function checkTypedWord(raw) {
  const word = String(raw ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
  if (word.length < 2) return { ok: false, error: 'Type a word of at least two letters.' }
  if (word.length > 40) return { ok: false, error: 'That is too long for a single word.' }
  if (!/^\p{L}[\p{L}'’ -]*\p{L}$/u.test(word))
    return { ok: false, error: 'Use letters only (spaces, hyphens and apostrophes are fine).' }
  return { ok: true, word }
}
