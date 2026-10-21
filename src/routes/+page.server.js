import { getDb } from '#lib/server/db.js'
import { getOrCreateDailySet } from '#lib/server/daily/publish.js'

/** Placeholder until Settings (T17) stores the learner's timezone. */
const timezone = () => process.env.DEFAULT_TIMEZONE || 'UTC'

export async function load() {
  const now = new Date()
  const tz = timezone()
  const set = await getOrCreateDailySet(getDb(), { now, timezone: tz })

  return {
    dateLabel: new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: tz
    }).format(now),
    status: set.status,
    remaining: set.remaining ?? 0,
    words: set.words.map((w) => ({
      slug: w.slug,
      headword: w.headword,
      pos: w.pos,
      topic: w.topic,
      confidence: w.confidence,
      pronunciation: String(w.content.pronunciation ?? ''),
      definition: String(w.content.definition ?? ''),
      practice: String(w.content.practice?.prompt ?? '')
    }))
  }
}
