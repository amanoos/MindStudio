// The learner's Claude key lives only in this browser's localStorage. This module is the only place
// that reads it, and it never logs it.

export const KEY_NAME = 'mind-studio.claude-key'

/** @returns {Storage | null} */
function storage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** @param {string} raw @returns {string | null} an error message, or null when it looks right */
export function checkKeyShape(raw) {
  const key = raw.trim()
  if (!key) return 'Paste your key first.'
  if (/\s/.test(key)) return 'A key has no spaces. Check what you pasted.'
  if (!key.startsWith('sk-ant-')) return 'Claude keys start with sk-ant-. Check what you pasted.'
  if (key.length < 20) return 'That key looks too short.'
  return null
}

/** @param {string} raw @returns {{ ok: true } | { ok: false, error: string }} */
export function saveKey(raw) {
  const problem = checkKeyShape(raw)
  if (problem) return { ok: false, error: problem }
  const s = storage()
  if (!s)
    return { ok: false, error: 'This browser is blocking storage, so the key cannot be kept.' }
  try {
    s.setItem(KEY_NAME, raw.trim())
    return { ok: true }
  } catch {
    return { ok: false, error: 'This browser would not save the key.' }
  }
}

/** The raw key, for the one request that needs it. @returns {string | null} */
export function readKey() {
  try {
    return storage()?.getItem(KEY_NAME) || null
  } catch {
    return null
  }
}

/** Only the last four characters, for display. @returns {string | null} */
export function maskedKey() {
  const key = readKey()
  return key ? `••••${key.slice(-4)}` : null
}

export function removeKey() {
  try {
    storage()?.removeItem(KEY_NAME)
  } catch {
    // nothing to remove if storage is blocked
  }
}
