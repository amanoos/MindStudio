import { getDb } from '#lib/server/db.js'
import { getSettings } from '#lib/server/settings.js'
import { getActivityHistory } from '#lib/server/activities.js'

/** @type {import('./$types').PageServerLoad} */
export async function load() {
  const db = getDb()
  const { timezone } = await getSettings(db)
  const when = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone
  })
  const history = await getActivityHistory(db, 200)
  return {
    entries: history.map((h) => ({ ...h, when: when.format(new Date(h.completedAt)) }))
  }
}
