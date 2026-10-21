import { getDb } from '../src/lib/server/db.js'
import { bootstrap } from '../src/lib/server/seed.js'

const { inserted, updated } = await bootstrap(getDb())
console.log(`Seed complete: ${inserted} new, ${updated} refreshed.`)
