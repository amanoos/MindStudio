import { getDb } from '../src/lib/server/db.js'
import { bootstrap } from '../src/lib/server/seed.js'

const { inserted, updated, skipped } = await bootstrap(getDb())
console.log(
  skipped
    ? 'Content unchanged, seed skipped.'
    : `Seed complete: ${inserted} new, ${updated} refreshed.`
)
