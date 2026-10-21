/**
 * Spaced-repetition scheduler. Pure: no I/O, no Date.now().
 *
 * `step` is how far up the ladder a word has climbed: 0 = not yet recalled, 1..5 = the interval
 * (in days) from LADDER_DAYS that was last scheduled. The ladder is a guide, not a science.
 */

/** @typedef {'again' | 'hard' | 'good' | 'easy'} Rating */
/** @typedef {'new' | 'learning' | 'familiar' | 'mastered' | 'revisit'} LearningState */

export const LADDER_DAYS = [1, 3, 7, 14, 30]
export const MAX_STEP = LADDER_DAYS.length
const AGAIN_MINUTES = 10
const DAY_MS = 86_400_000

/** @param {number} step @param {Rating} rating */
function nextStep(step, rating) {
  switch (rating) {
    case 'again':
      return 0
    case 'hard':
      return Math.max(step, 1)
    case 'good':
      return Math.min(step + 1, MAX_STEP)
    case 'easy':
      return Math.min(step + 2, MAX_STEP)
  }
}

/**
 * @param {{ step: number }} current
 * @param {Rating} rating
 * @param {Date} now
 * @returns {{ step: number, dueAt: Date, state: LearningState }}
 */
export function schedule(current, rating, now) {
  const step = nextStep(current.step, rating)

  if (rating === 'again') {
    // Forgetting a word you knew well is a lapse worth flagging.
    const state = current.step >= 3 ? 'revisit' : 'learning'
    return { step, dueAt: new Date(now.getTime() + AGAIN_MINUTES * 60_000), state }
  }

  const state = step >= MAX_STEP ? 'mastered' : step >= 3 ? 'familiar' : 'learning'
  return { step, dueAt: new Date(now.getTime() + LADDER_DAYS[step - 1] * DAY_MS), state }
}
