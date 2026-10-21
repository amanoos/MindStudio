import { fail } from '@sveltejs/kit'
import { getDb } from '#lib/server/db.js'
import { listNuanceWords } from '#lib/server/nuance-words.js'
import { flagAttempt, listAttempts, saveAttempt, attemptStats } from '#lib/server/exercises.js'

/** @type {import('./$types').PageServerLoad} */
export async function load() {
  const db = getDb()
  const [words, attempts, stats] = await Promise.all([
    listNuanceWords(db),
    listAttempts(db, 10),
    attemptStats(db)
  ])
  return { words, attempts, stats }
}

/** @type {import('./$types').Actions} */
export const actions = {
  // The passage is written in the browser, so the page sends the finished item along with the
  // choice. The server re-checks its shape and decides for itself whether the choice was right.
  save: async ({ request }) => {
    const form = await request.formData()
    let item
    try {
      item = JSON.parse(String(form.get('item') ?? ''))
    } catch {
      return fail(400, { error: 'That exercise could not be saved.' })
    }
    const saved = await saveAttempt(getDb(), {
      word: String(form.get('word') ?? ''),
      item,
      chosenIndex: Number(form.get('chosen')),
      model: String(form.get('model') ?? '') || null
    })
    if (!saved.ok) return fail(400, { error: saved.error })
    return { saved: { id: saved.id, correct: saved.correct } }
  },

  flag: async ({ request }) => {
    const form = await request.formData()
    const flagged = String(form.get('flagged')) === '1'
    const changed = await flagAttempt(getDb(), Number(form.get('id')), flagged)
    return changed ? { flagged } : fail(404, { error: 'Not found.' })
  }
}
