import { fail } from '@sveltejs/kit'
import { getDb } from '#lib/server/db.js'
import { getSettings } from '#lib/server/settings.js'
import { localDate } from '#lib/server/daily/select.js'
import { getFeaturedWords } from '#lib/server/words.js'
import { getReviewWords, recordRating } from '#lib/server/review.js'
import { buildQuestion } from '#lib/server/questions.js'

/** @param {string | null} v @param {number} fallback @param {number} max */
const clampInt = (v, fallback, max) => {
  const n = Number.parseInt(v ?? '', 10)
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), max) : fallback
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
  const db = getDb()
  const settings = await getSettings(db)
  const tz = settings.timezone
  const now = new Date()
  const scope = url.searchParams.get('scope') === 'today' ? 'today' : 'due'
  const topic = url.searchParams.get('topic') || undefined
  const pos = url.searchParams.get('pos') || undefined
  const favorites = url.searchParams.get('favorites') === '1'
  const limit = clampInt(url.searchParams.get('limit'), settings.sessionLength, 20)

  const pool = await getFeaturedWords(db)
  const words = await getReviewWords(db, {
    now,
    today: localDate(now, tz),
    scope,
    topic,
    pos,
    favorites,
    limit
  })

  return {
    scope,
    filters: { topic: topic ?? '', pos: pos ?? '', favorites },
    topics: [...new Set(pool.map((w) => w.topic))].sort(),
    questions: words.map((w) => buildQuestion(w, pool))
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  rate: async ({ request }) => {
    const form = await request.formData()
    const wordId = Number(form.get('wordId'))
    const correct = form.get('correct')
    try {
      await recordRating(getDb(), {
        wordId,
        rating: String(form.get('rating') ?? ''),
        activityType: String(form.get('type') ?? 'flashcard'),
        correct: correct === 'true' ? true : correct === 'false' ? false : undefined
      })
    } catch {
      return fail(400, { error: 'Could not save that rating.' })
    }
    return { ok: true }
  }
}
