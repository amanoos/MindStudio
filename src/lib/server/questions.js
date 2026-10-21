/**
 * Builds review questions from word content. Pure apart from the injected `rand`.
 *
 * @typedef {{ id: number, slug: string, headword: string, content: any }} QWord
 * @typedef {{ definition: string, example: string }} Explain
 * @typedef {
 *   | { type: 'flashcard', headword: string, answer: string }
 *   | { type: 'choice' | 'synonym', prompt: string, options: string[], answerIndex: number }
 *   | { type: 'fill', sentence: string, hint: string, accept: string[] }
 * } QuestionBody
 * @typedef {QuestionBody & { wordId: number, slug: string, headword: string, explain: Explain }} Question
 */

/** @template T @param {T[]} list @param {() => number} rand */
function shuffled(list, rand) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** @param {string} s */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Choice question: pick the word that matches a definition.
 * @param {QWord} word @param {QWord[]} others @param {() => number} rand
 */
function choice(word, others, rand) {
  const distractors = shuffled(others, rand)
    .map((o) => o.headword)
    .slice(0, 3)
  if (distractors.length < 3) return null
  const options = shuffled([word.headword, ...distractors], rand)
  return {
    type: /** @type {const} */ ('choice'),
    prompt: `Which word means: “${word.content.definition}”`,
    options,
    answerIndex: options.indexOf(word.headword)
  }
}

/** Fill-in-the-blank using one of the word's own example sentences. @param {QWord} word */
function fill(word) {
  const re = new RegExp(`\\b${escapeRe(word.headword)}\\w*\\b`, 'i')
  for (const ex of word.content.examples ?? []) {
    const match = re.exec(ex.text)
    if (!match) continue
    const token = match[0]
    return {
      type: /** @type {const} */ ('fill'),
      sentence: ex.text.replace(re, '_____'),
      hint: `${token[0]}… (${token.length} letters)`,
      accept: [...new Set([token.toLowerCase(), word.headword.toLowerCase()])]
    }
  }
  return null
}

/**
 * Synonym discrimination: which related word carries this particular shade of meaning?
 * @param {QWord} word @param {QWord[]} others @param {() => number} rand
 */
function synonym(word, others, rand) {
  const syns = word.content.synonyms ?? []
  if (!syns.length) return null
  const target = syns[Math.floor(rand() * syns.length)]
  const own = new Set(syns.map((/** @type {any} */ s) => s.word.toLowerCase()))
  const pool = others
    .flatMap((o) => (o.content.synonyms ?? []).map((/** @type {any} */ s) => s.word))
    .filter((w) => !own.has(String(w).toLowerCase()))
  const distractors = shuffled([...new Set(pool)], rand).slice(0, 3)
  if (distractors.length < 3) return null
  const options = shuffled([target.word, ...distractors], rand)
  return {
    type: /** @type {const} */ ('synonym'),
    prompt: `Close in meaning to “${word.headword}”, but with a difference: ${target.distinction} Which word is it?`,
    options,
    answerIndex: options.indexOf(target.word)
  }
}

/**
 * @param {QWord} word
 * @param {QWord[]} pool every featured word (the target is excluded automatically)
 * @param {{ rand?: () => number, type?: 'choice' | 'fill' | 'synonym' | 'flashcard' }} [opts]
 * @returns {Question}
 */
export function buildQuestion(word, pool, { rand = Math.random, type } = {}) {
  const others = pool.filter((p) => p.id !== word.id)
  const makers = {
    choice: () => choice(word, others, rand),
    fill: () => fill(word),
    synonym: () => synonym(word, others, rand),
    flashcard: () => ({
      type: /** @type {const} */ ('flashcard'),
      headword: word.headword,
      answer: String(word.content.definition)
    })
  }
  const order = type ? [type] : shuffled(['choice', 'fill', 'synonym', 'flashcard'], rand)
  /** @type {QuestionBody | null} */
  let body = null
  for (const t of [...order, 'flashcard']) {
    body = makers[/** @type {keyof typeof makers} */ (t)]()
    if (body) break
  }
  return {
    .../** @type {QuestionBody} */ (body),
    wordId: word.id,
    slug: word.slug,
    headword: word.headword,
    explain: {
      definition: String(word.content.definition),
      example: String(word.content.examples?.[0]?.text ?? '')
    }
  }
}
