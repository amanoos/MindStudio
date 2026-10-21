import { createClient } from '@libsql/client'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { migrate } from '../src/lib/server/db.js'

/**
 * Fresh migrated database in a temp file. (File, not :memory:, so concurrent transactions
 * behave like production.)
 */
export async function testDb() {
  const dir = mkdtempSync(join(tmpdir(), 'mind-studio-'))
  const db = createClient({ url: `file:${join(dir, 'test.db')}` })
  await migrate(db)
  return db
}

/**
 * @param {import('@libsql/client').Client} db
 * @param {string} headword
 * @param {Partial<{ topic: string, status: string }>} [over]
 */
export async function insertWord(db, headword, over = {}) {
  const { normalizeHeadword, slugify } = await import('../src/lib/server/normalize.js')
  const res = await db.execute({
    sql: `INSERT INTO word (normalized_headword, display_headword, slug, pos, topic, status, confidence)
          VALUES (?, ?, ?, 'noun', ?, ?, 'sourced')`,
    args: [
      normalizeHeadword(headword),
      headword,
      slugify(headword),
      over.topic ?? 'general',
      over.status ?? 'published'
    ]
  })
  const id = Number(res.lastInsertRowid)
  await db.execute({
    sql: 'INSERT INTO word_content (word_id, data) VALUES (?, ?)',
    args: [id, JSON.stringify({ definition: `Definition of ${headword}` })]
  })
  return id
}
