import { error, fail } from '@sveltejs/kit'
import { getDb } from '#lib/server/db.js'
import {
  checkAnswer,
  getActivity,
  listActivities,
  publicView,
  recordCapsule
} from '#lib/server/activities.js'
import { isStudioType } from '#lib/studio.js'

/** @param {string} type @param {string} slug */
async function requireActivity(type, slug) {
  if (!isStudioType(type)) error(404, 'Unknown kind of activity')
  const activity = await getActivity(getDb(), type, slug)
  if (!activity) error(404, 'We could not find that one.')
  return activity
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
  const activity = await requireActivity(params.type, params.slug)
  const all = await listActivities(getDb(), { type: activity.type })
  const others = all.filter((a) => a.slug !== activity.slug)
  const next = others.find((a) => !a.done) ?? others[0] ?? null

  return {
    // Answers, reasoning and the skill name stay on the server until the learner has answered.
    activity: publicView(activity),
    attempts: all.find((a) => a.slug === activity.slug)?.attempts ?? 0,
    next: next ? { slug: next.slug, title: next.title } : null,
    sources: (activity.data.sources ?? []).map(
      (/** @type {{ name: string, url: string, license?: string }} */ s) => ({
        name: s.name,
        url: s.url,
        field: 'reference',
        license: s.license ?? null,
        attribution: null
      })
    )
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  answer: async ({ params, request }) => {
    const activity = await requireActivity(params.type, params.slug)
    const form = await request.formData()
    try {
      const answered = await checkAnswer(getDb(), activity.slug, Number(form.get('choice')))
      return { answered }
    } catch {
      return fail(400, { error: 'Please choose one of the answers.' })
    }
  },

  capsule: async ({ params, request }) => {
    const activity = await requireActivity(params.type, params.slug)
    const form = await request.formData()
    try {
      await recordCapsule(getDb(), activity.slug, String(form.get('reflection') ?? ''))
      return { finished: true }
    } catch {
      return fail(400, { error: 'That one is not a capsule.' })
    }
  }
}
