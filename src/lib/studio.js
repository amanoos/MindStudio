/**
 * What each Mind Studio activity type is called and how it is presented. Safe to import from
 * both server and browser code (no secrets, no database).
 */

/** @typedef {'teaser' | 'capsule' | 'critical'} StudioType */

export const STUDIO_TYPES =
  /** @type {Record<StudioType, { title: string, single: string, blurb: string, color: string, minutes: string }>} */ ({
    teaser: {
      title: 'Brain Teasers',
      single: 'Brain teaser',
      blurb:
        'Logic, patterns, probability and lateral thinking. Take a guess, then see the reasoning.',
      color: 'grape',
      minutes: '2 to 5 minutes'
    },
    capsule: {
      title: 'Curiosity Capsules',
      single: 'Curiosity capsule',
      blurb:
        'A short, sourced story from history, science, art or technology, with a question to chew on.',
      color: 'sun',
      minutes: '3 to 6 minutes'
    },
    critical: {
      title: 'Critical Thinking Lab',
      single: 'Critical thinking prompt',
      blurb: 'Spot the hidden assumption, the biased sample or the shaky argument, then see why.',
      color: 'mint',
      minutes: '3 to 8 minutes'
    }
  })

/** @param {string} value @returns {value is StudioType} */
export const isStudioType = (value) => Object.hasOwn(STUDIO_TYPES, value)
