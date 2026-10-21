import { getDb } from '#lib/server/db.js'
import { getSettings } from '#lib/server/settings.js'
import { getProgressStats } from '#lib/server/stats.js'

/** @type {import('./$types').PageServerLoad} */
export async function load() {
  const db = getDb()
  const { timezone } = await getSettings(db)
  return { stats: await getProgressStats(db, { timezone }) }
}
