import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Mind Studio content: brain teasers, curiosity capsules and critical-thinking prompts.
 * Same honesty rules as words: anything that makes a factual claim needs a source link.
 */

export const ACTIVITY_TYPES = /** @type {const} */ (['teaser', 'capsule', 'critical'])
export const TEASER_KINDS = ['logic', 'pattern', 'lateral', 'probability', 'number']

/** @param {unknown} v */
const isText = (v) => typeof v === 'string' && v.trim().length > 0
/** @param {unknown} s */
const isHttpUrl = (s) => typeof s === 'string' && /^https?:\/\/\S+$/.test(s)
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** @param {unknown} v @returns {string[]} */
function allStrings(v) {
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.flatMap(allStrings)
  if (v && typeof v === 'object') return Object.values(v).flatMap(allStrings)
  return []
}

/**
 * @param {any} a
 * @param {string[]} [blocklist]
 * @returns {string[]} problems; empty means valid
 */
export function validateActivity(a, blocklist = []) {
  /** @type {string[]} */
  const errors = []
  if (!isText(a?.slug) || !SLUG.test(a.slug)) errors.push('slug must be kebab-case')
  if (!ACTIVITY_TYPES.includes(a?.type)) errors.push('type must be teaser, capsule or critical')
  if (!isText(a?.title)) errors.push('title is required')
  if (!Number.isInteger(a?.difficulty) || a.difficulty < 1 || a.difficulty > 3)
    errors.push('difficulty must be 1, 2 or 3')

  /** @param {unknown} options */
  const checkChoices = (options) => {
    if (
      !Array.isArray(options) ||
      options.length < 3 ||
      options.length > 5 ||
      !options.every(isText)
    )
      errors.push('options: provide 3 to 5 non-empty choices')
    else if (new Set(options.map((o) => o.trim().toLowerCase())).size !== options.length)
      errors.push('options must all be different')
    if (
      !Number.isInteger(a?.answerIndex) ||
      a.answerIndex < 0 ||
      a.answerIndex >= (Array.isArray(options) ? options.length : 0)
    )
      errors.push('answerIndex must point at one of the options')
  }

  /** @param {unknown} list @param {string} label */
  const checkSources = (list, label) => {
    if (!Array.isArray(list) || list.length === 0)
      errors.push(`${label}: at least one source is required`)
    else
      list.forEach((s, i) => {
        if (!isText(s?.name)) errors.push(`${label}[${i}]: name is required`)
        if (!isHttpUrl(s?.url)) errors.push(`${label}[${i}]: url must be http(s)`)
      })
  }

  if (a?.type === 'teaser') {
    if (!TEASER_KINDS.includes(a.kind))
      errors.push(`kind must be one of ${TEASER_KINDS.join(', ')}`)
    if (!isText(a.prompt)) errors.push('prompt is required')
    if (!isText(a.reasoning)) errors.push('reasoning is required')
    if (a.hint !== undefined && !isText(a.hint)) errors.push('hint must be non-empty when present')
    checkChoices(a.options)
  } else if (a?.type === 'capsule') {
    if (!isText(a.area)) errors.push('area is required')
    if (!Array.isArray(a.body) || a.body.length < 2 || !a.body.every(isText))
      errors.push('body: provide at least two paragraphs')
    if (!isText(a.keyIdea)) errors.push('keyIdea is required')
    if (!isText(a.followUp)) errors.push('followUp question is required')
    checkSources(a.sources, 'sources')
  } else if (a?.type === 'critical') {
    if (!isText(a.skill)) errors.push('skill is required')
    if (!isText(a.scenario)) errors.push('scenario is required')
    if (!isText(a.question)) errors.push('question is required')
    if (!isText(a.explanation)) errors.push('explanation is required')
    checkChoices(a.options)
    checkSources(a.sources, 'sources')
  }

  const text = allStrings(a).join(' \n ').toLowerCase()
  for (const bad of blocklist) {
    if (new RegExp(`\\b${bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text))
      errors.push('contains a blocked term')
  }
  return errors
}

/**
 * @param {string} dir content/activities
 * @returns {Promise<{ file: string, activity: any }[]>}
 */
export async function loadActivityFiles(dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  /** @type {{ file: string, activity: any }[]} */
  const out = []
  for (const file of files) {
    const list = JSON.parse(await readFile(join(dir, file), 'utf8'))
    for (const activity of list) out.push({ file, activity })
  }
  return out
}

/**
 * @param {{ file: string, activity: any }[]} entries
 * @param {string[]} [blocklist]
 * @returns {string[]}
 */
export function lintActivities(entries, blocklist = []) {
  /** @type {string[]} */
  const errors = []
  /** @type {Map<string, string>} */
  const seen = new Map()
  for (const { file, activity } of entries) {
    const label = `${file} › ${activity?.slug ?? '(no slug)'}`
    for (const e of validateActivity(activity, blocklist)) errors.push(`${label}: ${e}`)
    if (isText(activity?.slug)) {
      if (seen.has(activity.slug))
        errors.push(`${label}: duplicate slug (also in ${seen.get(activity.slug)})`)
      else seen.set(activity.slug, file)
    }
  }
  return errors
}
