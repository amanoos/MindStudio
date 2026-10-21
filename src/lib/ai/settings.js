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
