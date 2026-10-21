// Builds the Word Nuance request. It contains only the word, the offered synonyms and the three
// settings: nothing about the learner, their history or their notes.

export const LENGTHS = ['sentence', 'paragraph']
export const DIFFICULTIES = ['gentle', 'medium', 'tricky']
export const BLANK = '_____'

/** Properties of one generated item, as a JSON schema for structured outputs. */
export const NUANCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['passage', 'options', 'correct_index', 'reason', 'option_notes'],
  properties: {
    passage: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    correct_index: { type: 'integer' },
    reason: { type: 'string' },
    option_notes: { type: 'array', items: { type: 'string' } }
  }
}

export const SYSTEM_PROMPT = [
  'You write one vocabulary exercise called Word Nuance for a fluent adult English learner.',
  `Write a passage with exactly one blank, shown as ${BLANK}. The blank must be a spot where a word`,
  'and several near-synonyms could each seem plausible, but exactly one fits best because of',
  'connotation, register, collocation, intensity or context. The best word may be the target word',
  'or one of its synonyms; choose whichever the passage truly calls for. Never make two options',
  'equally correct. Do not reveal the answer in the passage, and do not use any of the options',
  'anywhere in the passage.',
  'Return the options in any order. correct_index is the zero-based position of the best option.',
  'option_notes has one short note per option, in the same order: for the best option say why it',
  'fits; for each other option say, kindly, why it is less fitting here. reason is a short',
  'explanation (two or three sentences) of why the best word wins. Plain text only, no markdown',
  'and no HTML. Use only the schema.'
].join(' ')

/** @param {string} s */
const clean = (s) =>
  String(s)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)

/**
 * @param {{ word: string, options?: string[], length?: string, difficulty?: string, choices?: number }} input
 * @returns {{ system: string, user: string, schema: typeof NUANCE_SCHEMA }}
 */
export function buildNuancePrompt(input) {
  const word = clean(input.word)
  const given = (input.options ?? []).map(clean).filter(Boolean)
  const length = LENGTHS.includes(String(input.length)) ? String(input.length) : 'sentence'
  const difficulty = DIFFICULTIES.includes(String(input.difficulty))
    ? String(input.difficulty)
    : 'medium'
  const choices = Math.min(6, Math.max(4, Math.round(input.choices ?? 4)))

  const lines = [
    `Target word: ${word}`,
    given.length
      ? `Synonyms to offer as options: ${given.join(', ')}. If that is fewer than needed, add near-synonyms yourself.`
      : `No synonyms were supplied: choose near-synonyms yourself.`,
    `Total number of options: ${choices} (the target word plus ${choices - 1} near-synonyms).`,
    `Length: one ${length}.`,
    `Difficulty: ${difficulty} (${
      difficulty === 'gentle'
        ? 'the best word is fairly clear'
        : difficulty === 'tricky'
          ? 'the options are very close and the difference is subtle'
          : 'a real but fair distinction'
    }).`
  ]
  return { system: SYSTEM_PROMPT, user: lines.join('\n'), schema: NUANCE_SCHEMA }
}
