import { error } from '@sveltejs/kit'
import { getDb } from '#lib/server/db.js'
import { listActivities } from '#lib/server/activities.js'
import { isStudioType } from '#lib/studio.js'

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
  if (!isStudioType(params.type)) error(404, 'Unknown kind of activity')
  const activities = await listActivities(getDb(), { type: params.type })

  // "Surprise me" prefers something not yet tried.
  const untried = activities.filter((a) => !a.done)
  const pool = untried.length ? untried : activities
  const surprise = pool.length ? pool[Math.floor(Math.random() * pool.length)].slug : null

  return { type: params.type, activities, surprise }
}
