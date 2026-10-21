import { join } from 'node:path'
import { loadBlocklist, loadWordFiles, lintWords } from './content.js'
import { migrate } from './db.js'
import { normalizeHeadword, slugify } from './normalize.js'

/**
 * Insert or refresh words from validated entries. Re-running never creates duplicates and never
 * touches the featured ledger, so improving a word's content later is safe.
 * @param {import('@libsql/client').Client} db
 * @param {{ file: string, word: any }[]} entries
 * @returns {Promise<{ inserted: number, updated: number }>}
 */
export async function seedWords(db, entries) {
  let inserted = 0
  let updated = 0
  for (const { word } of entries) {
    const key = normalizeHeadword(word.headword)
    const existing = await db.execute({
      sql: 'SELECT id FROM word WHERE normalized_headword = ?',
      args: [key]
    })
    const fields = [
      word.headword,
      word.pos.join(', '),
      word.difficulty,
      word.topic,
      word.etymology.confidence
    ]
    let id
    if (existing.rows.length) {
      id = Number(existing.rows[0].id)
      await db.execute({
        sql: 'UPDATE word SET display_headword=?, pos=?, difficulty=?, topic=?, confidence=? WHERE id=?',
        args: [...fields, id]
      })
      updated++
    } else {
      const res = await db.execute({
        sql: `INSERT INTO word (normalized_headword, display_headword, slug, pos, difficulty, topic, confidence)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [key, word.headword, slugify(word.headword), ...fields.slice(1)]
      })
      id = Number(res.lastInsertRowid)
      inserted++
    }
    await db.execute({
      sql: `INSERT INTO word_content (word_id, data) VALUES (?, ?)
            ON CONFLICT(word_id) DO UPDATE SET data = excluded.data`,
      args: [id, JSON.stringify(word)]
    })
    await db.execute({ sql: 'DELETE FROM word_source WHERE word_id = ?', args: [id] })
    const sources = [
      ...word.etymology.sources.map((/** @type {any} */ s) => ({ ...s, field: 'etymology' })),
      ...(word.historicalSources ?? []).map((/** @type {any} */ s) => ({ ...s, field: 'history' })),
      ...word.sources.map((/** @type {any} */ s) => ({ ...s, field: 'general' }))
    ]
    for (const s of sources) {
      await db.execute({
        sql: 'INSERT INTO word_source (word_id, name, url, field, license, attribution) VALUES (?, ?, ?, ?, ?, ?)',
        args: [id, s.name, s.url, s.field, s.license ?? null, s.attribution ?? null]
      })
    }
  }
  return { inserted, updated }
}

/**
 * Boot sequence: migrate, lint content (refuse to start on problems), seed.
 * @param {import('@libsql/client').Client} db
 * @param {string} [root]
 */
export async function bootstrap(db, root = process.cwd()) {
  await migrate(db, join(root, 'db', 'migrations'))
  const entries = await loadWordFiles(join(root, 'content', 'words'))
  const errors = lintWords(entries, await loadBlocklist(join(root, 'content', 'blocklist.txt')))
  if (errors.length) throw new Error(`Content lint failed:\n${errors.join('\n')}`)
  return seedWords(db, entries)
}
