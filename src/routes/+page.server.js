import { getDb } from '#lib/server/db.js'
import { getSettings } from '#lib/server/settings.js'
import { findSet, getOrCreateDailySet } from '#lib/server/daily/publish.js'
import { localDate } from '#lib/server/daily/select.js'
import { dayBefore } from '#lib/server/streak.js'
import { countDue } from '#lib/server/review.js'
import { pickDaily } from '#lib/server/activities.js'
import { getSeenWordIds, getStreak, getTodayProgress, hasEarlierSet } from '#lib/server/progress.js'

/** @param {import('#lib/server/daily/publish.js').SetWord} w */
const card = (w) => ({
  slug: w.slug,
  headword: w.headword,
  pos: w.pos,
  topic: w.topic,
  confidence: w.confidence,
  pronunciation: String(w.content.pronunciation ?? ''),
  definition: String(w.content.definition ?? '')
})

export async function load() {
  const db = getDb()
  const now = new Date()
  const tz = (await getSettings(db)).timezone
  const set = await getOrCreateDailySet(db, { now, timezone: tz })
  const today = localDate(now, tz)
  const yesterday = dayBefore(today)

  // A missed day is never dumped on the learner. It is offered, and only if it was skipped.
  const earlier = await findSet(db, yesterday)
  const canCatchUp = !earlier && (await hasEarlierSet(db, yesterday))
  let catchUpWords = /** @type {ReturnType<typeof card>[]} */ ([])
  if (earlier) {
    const seen = await getSeenWordIds(
      db,
      earlier.words.map((w) => w.id)
    )
    catchUpWords = earlier.words.filter((w) => !seen.has(w.id)).map(card)
  }

  return {
    today,
    dateLabel: new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: tz
    }).format(now),
    status: set.status,
    remaining: set.remaining ?? 0,
    words: set.words.map(card),
    progress: await getTodayProgress(
      db,
      set.words.map((w) => w.id),
      tz,
      now
    ),
    streak: await getStreak(db, tz, now),
    due: await countDue(db, now),
    mindStretch: await pickDaily(db, today),
    canCatchUp,
    catchUpWords
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  catchUp: async () => {
    const db = getDb()
    const tz = (await getSettings(db)).timezone
    const yesterday = dayBefore(localDate(new Date(), tz))
    await getOrCreateDailySet(db, { timezone: tz, date: yesterday })
    return { ok: true }
  }
}
