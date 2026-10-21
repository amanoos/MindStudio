/**
 * Headword normalization: the single place the duplicate rules live.
 * Two spellings that normalize to the same key can only be featured once.
 *
 * Steps: Unicode NFKC, case-fold, strip diacritics, drop everything that is not a letter or
 * digit (so hyphen/space/apostrophe variants collapse), then a conservative inflection stem.
 */

/** @param {string} s */
function stemOnce(s) {
  let w = s
  if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.length > 5 && /(ss|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2)
  if (w.length > 4 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  for (const suffix of ['ing', 'ed']) {
    if (w.length > suffix.length + 3 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length)
      // "stopped" -> "stopp" -> "stop"
      if (/([^aeiou])\1$/.test(w) && !/(ll|ss|ff|zz)$/.test(w)) w = w.slice(0, -1)
      return w
    }
  }
  return w
}

/**
 * @param {string} raw
 * @param {Record<string, string>} [lemmaOverrides] manual map of normalized form -> canonical key
 * @returns {string}
 */
export function normalizeHeadword(raw, lemmaOverrides = {}) {
  let w = raw
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '')

  for (let i = 0; i < 4; i++) {
    let next = stemOnce(w)
    // "obfuscate" and "obfuscated" -> same key; short words keep their e ("bare" stays distinct from "bar").
    if (next.length >= 6 && next.endsWith('e')) next = next.slice(0, -1)
    if (next === w) break
    w = next
  }

  return lemmaOverrides[w] ?? w
}

/**
 * Display slug for URLs. Not used for duplicate checks.
 * @param {string} display
 */
export function slugify(display) {
  return display
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
