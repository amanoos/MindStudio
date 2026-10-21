import { error, fail } from '@sveltejs/kit'
import { getDb } from '#lib/server/db.js'
import { timezone } from '#lib/server/config.js'
import { getFeaturedWord } from '#lib/server/words.js'
import { saveNote, setFavorite } from '#lib/server/notes.js'
import { markRevisit, recordView } from '#lib/server/review.js'
import { reportIssue } from '#lib/server/issues.js'

/** @param {string} slug */
async function requireWord(slug) {
  const word = await getFeaturedWord(getDb(), slug)
  if (!word) error(404, 'That word has not been featured yet.')
  return word
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
  const word = await requireWord(params.slug)
  // Opening a card counts as engagement for today's progress, never as mastery.
  await recordView(getDb(), word.id, timezone())
  return { word }
}

/** @type {import('./$types').Actions} */
export const actions = {
  note: async ({ params, request }) => {
    const word = await requireWord(params.slug)
    const form = await request.formData()
    await saveNote(getDb(), word.id, {
      note: String(form.get('note') ?? ''),
      tags: String(form.get('tags') ?? '')
    })
    return { saved: true }
  },

  favorite: async ({ params, request }) => {
    const word = await requireWord(params.slug)
    const form = await request.formData()
    await setFavorite(getDb(), word.id, form.get('favorite') === '1')
    return { ok: true }
  },

  revisit: async ({ params }) => {
    const word = await requireWord(params.slug)
    await markRevisit(getDb(), word.id)
    return { revisit: true }
  },

  report: async ({ params, request }) => {
    const word = await requireWord(params.slug)
    const form = await request.formData()
    const comment = String(form.get('comment') ?? '')
    if (comment.length > 1000) return fail(400, { error: 'Please keep it under 1000 characters.' })
    await reportIssue(getDb(), word.id, String(form.get('field') ?? 'other'), comment)
    return { reported: true }
  }
}
