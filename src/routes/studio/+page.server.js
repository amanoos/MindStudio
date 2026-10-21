import { getDb } from '#lib/server/db.js'
import { getSettings } from '#lib/server/settings.js'
import { localDate } from '#lib/server/daily/select.js'
import { getActivityHistory, getTypeCounts, pickDaily } from '#lib/server/activities.js'

/** @type {import('./$types').PageServerLoad} */
export async function load() {
  const db = getDb()
  const { timezone } = await getSettings(db)
  const [counts, pick, recent] = await Promise.all([
    getTypeCounts(db),
    pickDaily(db, localDate(new Date(), timezone)),
    getActivityHistory(db, 3)
  ])
  return { counts, pick, recent }
}
