// Per-browser exercise settings (which Claude model to use). Kept in localStorage next to the key,
// never sent to our server.

import { DEFAULT_MODEL, MODELS } from './claude.js'

const MODEL_NAME = 'mind-studio.claude-model'

/** @returns {string} */
export function getModel() {
  try {
    const stored = globalThis.localStorage?.getItem(MODEL_NAME)
    if (stored && MODELS.some((m) => m.id === stored)) return stored
  } catch {
    // blocked storage: use the default
  }
  return DEFAULT_MODEL
}

/** @param {string} id */
export function setModel(id) {
  if (!MODELS.some((m) => m.id === id)) return
  try {
    globalThis.localStorage?.setItem(MODEL_NAME, id)
  } catch {
    // blocked storage: the choice just will not stick
  }
}

const CHECK_NAME = 'mind-studio.second-opinion'

/** Whether to double-check each exercise with a second request. Off unless switched on. */
export function getSecondOpinion() {
  try {
    return globalThis.localStorage?.getItem(CHECK_NAME) === '1'
  } catch {
    return false
  }
}

/** @param {boolean} on */
export function setSecondOpinion(on) {
  try {
    globalThis.localStorage?.setItem(CHECK_NAME, on ? '1' : '0')
  } catch {
    // blocked storage: the choice just will not stick
  }
}
