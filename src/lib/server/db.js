import { createClient } from '@libsql/client'
import { mkdirSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** @typedef {import('@libsql/client').Client} Client */

/** @type {Client | undefined} */
let shared

/**
 * Process-wide client. Local file by default; set DATABASE_URL (libsql://...) and
 * DATABASE_AUTH_TOKEN for Turso.
 * @returns {Client}
 */
export function getDb() {
  if (!shared) {
    const url = process.env.DATABASE_URL || 'file:data/app.db'
    // A fresh checkout has no data/ folder; SQLite will not create parent directories itself.
    if (url.startsWith('file:') && !url.includes(':memory:'))
      mkdirSync(dirname(url.slice('file:'.length)), { recursive: true })
    shared = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined })
  }
  return shared
}

/**
 * Apply any migration files not yet recorded, in filename order.
 * @param {Client} db
 * @param {string} [dir]
 * @returns {Promise<string[]>} names of the migrations applied this run
 */
export async function migrate(db, dir = join(process.cwd(), 'db', 'migrations')) {
  await db.execute(
    "CREATE TABLE IF NOT EXISTS _migration (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))"
  )
  const done = new Set(
    (await db.execute('SELECT name FROM _migration')).rows.map((r) => String(r.name))
  )
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
  /** @type {string[]} */
  const applied = []
  for (const file of files) {
    if (done.has(file)) continue
    const sql = await readFile(join(dir, file), 'utf8')
    await db.executeMultiple(sql)
    await db.execute({ sql: 'INSERT INTO _migration (name) VALUES (?)', args: [file] })
    applied.push(file)
  }
  return applied
}
