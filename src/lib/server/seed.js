import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { loadBlocklist, loadWordFiles, lintWords } from './content.js'
import { lintActivities, loadActivityFiles } from './activity-content.js'
import { migrate } from './db.js'
import { normalizeHeadword, slugify } from './normalize.js'

/**
 * Insert or refresh words from validated entries. Re-running never creates duplicates and never
 * touches the featured ledger, so improving a word's content later is safe.
 *
 * Each word is written in a single batched round trip, which matters against a remote database
 * such as Turso, where every separate statement costs a network hop.
 * @param {import('@libsql/client').Client} db
 * @param {{ file: string, word: any }[]} entries
 * @returns {Promise<{ inserted: number, updated: number }>}
 */
export async function seedWords(db, entries) {
  const existing = new Set(
    (await db.execute('SELECT normalized_headword FROM word')).rows.map((r) =>
      String(r.normalized_headword)
    )
  )
  let inserted = 0
  let updated = 0

  for (const { word } of entries) {
    const key = normalizeHeadword(word.headword)
    if (existing.has(key)) updated++
    else inserted++

    const sources = [
      ...word.etymology.sources.map((/** @type {any} */ s) => ({ ...s, field: 'etymology' })),
      ...(word.historicalSources ?? []).map((/** @type {any} */ s) => ({ ...s, field: 'history' })),
      ...word.sources.map((/** @type {any} */ s) => ({ ...s, field: 'general' }))
    ]

    await db.batch(
      [
        {
          sql: `INSERT INTO word (normalized_headword, display_headword, slug, pos, difficulty, topic, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(normalized_headword) DO UPDATE SET
                  display_headword = excluded.display_headword, pos = excluded.pos,
                  difficulty = excluded.difficulty, topic = excluded.topic,
                  confidence = excluded.confidence`,
          args: [
            key,
            word.headword,
            slugify(word.headword),
            word.pos.join(', '),
            word.difficulty,
            word.topic,
            word.etymology.confidence
          ]
        },
        {
          sql: `INSERT INTO word_content (word_id, data)
                SELECT id, ? FROM word WHERE normalized_headword = ?
                ON CONFLICT(word_id) DO UPDATE SET data = excluded.data`,
          args: [JSON.stringify(word), key]
        },
        {
          sql: 'DELETE FROM word_source WHERE word_id = (SELECT id FROM word WHERE normalized_headword = ?)',
          args: [key]
        },
        ...sources.map((s) => ({
          sql: `INSERT INTO word_source (word_id, name, url, field, license, attribution)
                SELECT id, ?, ?, ?, ?, ? FROM word WHERE normalized_headword = ?`,
          args: [s.name, s.url, s.field, s.license ?? null, s.attribution ?? null, key]
        }))
      ],
      'write'
    )
  }
  return { inserted, updated }
}

/** Fingerprint of all word and activity content, so unchanged content is not re-seeded on every start. */
function contentHash(
  /** @type {{ word: any }[]} */ entries,
  /** @type {{ activity: any }[]} */ activities
) {
  return createHash('sha256')
    .update(JSON.stringify([entries.map((e) => e.word), activities.map((e) => e.activity)]))
    .digest('hex')
}

/**
 * Insert or refresh Mind Studio activities in a single round trip. Attempts reference an
 * activity by id, so existing rows are updated in place and never deleted.
 * @param {import('@libsql/client').Client} db
 * @param {{ file: string, activity: any }[]} activities
 */
export async function seedActivities(db, activities) {
  if (!activities.length) return
  await db.batch(
    activities.map(({ activity: a }) => ({
      sql: `INSERT INTO activity (slug, type, title, data, difficulty)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET
              type = excluded.type, title = excluded.title,
              data = excluded.data, difficulty = excluded.difficulty`,
      args: [a.slug, a.type, a.title, JSON.stringify(a), a.difficulty]
    })),
    'write'
  )
}

/**
 * Boot sequence: migrate, lint content (refuse to start on problems), seed. Seeding is skipped
 * when the content is unchanged since the last successful seed, so free-tier cold starts stay fast.
 * @param {import('@libsql/client').Client} db
 * @param {string} [root]
 * @returns {Promise<{ inserted: number, updated: number, skipped: boolean }>}
 */
export async function bootstrap(db, root = process.cwd()) {
  await migrate(db, join(root, 'db', 'migrations'))
  const entries = await loadWordFiles(join(root, 'content', 'words'))
  const activities = await loadActivityFiles(join(root, 'content', 'activities'))
  const blocklist = await loadBlocklist(join(root, 'content', 'blocklist.txt'))
  const errors = [...lintWords(entries, blocklist), ...lintActivities(activities, blocklist)]
  if (errors.length) throw new Error(`Content lint failed:\n${errors.join('\n')}`)

  const hash = contentHash(entries, activities)
  const saved = await db.execute("SELECT value FROM setting WHERE key = 'content_hash'")
  if (saved.rows[0]?.value === hash) return { inserted: 0, updated: 0, skipped: true }

  const result = await seedWords(db, entries)
  await seedActivities(db, activities)
  await db.execute({
    sql: `INSERT INTO setting (key, value) VALUES ('content_hash', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [hash]
  })
  return { ...result, skipped: false }
}
