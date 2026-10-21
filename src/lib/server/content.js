import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { normalizeHeadword } from './normalize.js'

/**
 * @typedef {{ word: string, distinction: string }} Synonym
 * @typedef {{ text: string, kind: 'everyday' | 'rich' }} Example
 * @typedef {{ name: string, url: string, license?: string, attribution?: string }} Source
 * @typedef {{
 *   headword: string, pos: string[], pronunciation: string, topic: string, difficulty: number,
 *   definition: string, register: string, nuance: string,
 *   synonyms: Synonym[], antonyms?: string[], examples: Example[],
 *   etymology: { summary: string, confidence: 'sourced' | 'uncertain', sources: Source[] },
 *   historicalNotes?: string, historicalSources?: Source[],
 *   currentUsage: string, memoryHook: string, practice: { prompt: string },
 *   sources: Source[]
 * }} WordEntry
 */

const TEXT_FIELDS = [
  'headword',
  'pronunciation',
  'topic',
  'definition',
  'register',
  'nuance',
  'currentUsage',
  'memoryHook'
]

/** @param {unknown} v */
const isText = (v) => typeof v === 'string' && v.trim().length > 0

/** @param {unknown} s */
const isHttpUrl = (s) => typeof s === 'string' && /^https?:\/\/\S+$/.test(s)

/**
 * @param {unknown} list
 * @param {string} label
 * @param {string[]} errors
 */
function checkSources(list, label, errors) {
  if (!Array.isArray(list) || list.length === 0) {
    errors.push(`${label}: at least one source is required`)
    return
  }
  list.forEach((s, i) => {
    if (!isText(s?.name)) errors.push(`${label}[${i}]: name is required`)
    if (!isHttpUrl(s?.url)) errors.push(`${label}[${i}]: url must be http(s)`)
  })
}

/**
 * Collect every string in the entry for the offensive-term check.
 * @param {unknown} v
 * @returns {string[]}
 */
function allStrings(v) {
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.flatMap(allStrings)
  if (v && typeof v === 'object') return Object.values(v).flatMap(allStrings)
  return []
}

/**
 * @param {any} w
 * @param {string[]} [blocklist]
 * @returns {string[]} human-readable problems (empty = valid)
 */
export function validateWord(w, blocklist = []) {
  /** @type {string[]} */
  const errors = []
  for (const f of TEXT_FIELDS) if (!isText(w?.[f])) errors.push(`${f} is required`)

  if (!Array.isArray(w?.pos) || w.pos.length === 0 || !w.pos.every(isText))
    errors.push('pos must be a non-empty list of strings')
  if (!Number.isInteger(w?.difficulty) || w.difficulty < 1 || w.difficulty > 3)
    errors.push('difficulty must be 1, 2 or 3')

  const syn = w?.synonyms
  if (!Array.isArray(syn) || syn.length < 3 || syn.length > 8)
    errors.push('synonyms: provide 3 to 8 entries')
  else
    syn.forEach((s, i) => {
      if (!isText(s?.word) || !isText(s?.distinction))
        errors.push(`synonyms[${i}]: word and distinction are required`)
    })

  const ex = w?.examples
  if (!Array.isArray(ex) || ex.length < 2) errors.push('examples: at least two are required')
  else {
    ex.forEach((e, i) => {
      if (!isText(e?.text)) errors.push(`examples[${i}]: text is required`)
      if (!['everyday', 'rich'].includes(e?.kind)) errors.push(`examples[${i}]: kind`)
    })
    if (!ex.some((e) => e?.kind === 'everyday') || !ex.some((e) => e?.kind === 'rich'))
      errors.push('examples: need one everyday and one rich example')
  }

  const et = w?.etymology
  if (!isText(et?.summary)) errors.push('etymology.summary is required')
  if (!['sourced', 'uncertain'].includes(et?.confidence))
    errors.push('etymology.confidence must be sourced or uncertain')
  checkSources(et?.sources, 'etymology.sources', errors)

  if (w?.historicalNotes !== undefined) {
    if (!isText(w.historicalNotes)) errors.push('historicalNotes must be non-empty when present')
    checkSources(w?.historicalSources, 'historicalSources', errors)
  }

  if (!isText(w?.practice?.prompt)) errors.push('practice.prompt is required')
  checkSources(w?.sources, 'sources', errors)

  const text = allStrings(w).join(' \n ').toLowerCase()
  for (const bad of blocklist) {
    if (new RegExp(`\\b${bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text))
      errors.push('contains a blocked term')
  }
  return errors
}

/**
 * @param {string} dir content/words
 * @returns {Promise<{ file: string, word: any }[]>}
 */
export async function loadWordFiles(dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  /** @type {{ file: string, word: any }[]} */
  const out = []
  for (const file of files) {
    const list = JSON.parse(await readFile(join(dir, file), 'utf8'))
    for (const word of list) out.push({ file, word })
  }
  return out
}

/** @param {string} path */
export async function loadBlocklist(path) {
  try {
    return (await readFile(path, 'utf8'))
      .split('\n')
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l && !l.startsWith('#'))
  } catch {
    return []
  }
}

/**
 * Validate every entry and check for duplicate normalized headwords across all files.
 * @param {{ file: string, word: any }[]} entries
 * @param {string[]} [blocklist]
 * @returns {string[]} errors, each prefixed with file and headword
 */
export function lintWords(entries, blocklist = []) {
  /** @type {string[]} */
  const errors = []
  /** @type {Map<string, string>} */
  const seen = new Map()
  for (const { file, word } of entries) {
    const label = `${file} › ${word?.headword ?? '(no headword)'}`
    for (const e of validateWord(word, blocklist)) errors.push(`${label}: ${e}`)
    if (isText(word?.headword)) {
      const key = normalizeHeadword(word.headword)
      const prior = seen.get(key)
      if (prior) errors.push(`${label}: duplicates "${prior}" (same normalized headword)`)
      else seen.set(key, word.headword)
    }
  }
  return errors
}
