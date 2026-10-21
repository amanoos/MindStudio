import { getDb, migrate } from '../src/lib/server/db.js'

const applied = await migrate(getDb())
console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.')
