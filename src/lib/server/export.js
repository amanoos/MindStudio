/**
 * Backup, restore and wordbook export. The backup holds only what the learner created or earned
 * (what was featured, reviews, notes, settings). Word content comes from the app's own content
 * files, so words are identified by their normalized headword and restore works on any database
 * that has been seeded, even when row ids differ.
 */

/** @typedef {import('@libsql/client').Client} Client */
/** @typedef {import('@libsql/client').InStatement} Statement */

export const BACKUP_FORMAT = 'mind-studio-backup'
export const BACKUP_VERSION = 1

/** Setting keys that belong to the app, not the learner, and are never backed up or restored. */
const INTERNAL_SETTINGS = ['content_hash']

/** @param {unknown} v */
const str = (v) => (v === null || v === undefined ? null : String(v))

/**
 * Everything the learner would hate to lose, as plain JSON.
 * @param {Client} db
 * @param {Date} [now]
 */
export async function buildBackup(db, now = new Date()) {
  const [ledger, sets, states, attempts, notes, activityAttempts, issues, settings] =
    await Promise.all([
      db.execute(
        `SELECT w.normalized_headword AS word, f.first_featured_date AS date
         FROM featured_ledger f JOIN word w ON w.id = f.word_id
         ORDER BY f.first_featured_date, w.id`
      ),
      db.execute(
        `SELECT s.local_date AS date, s.timezone AS timezone, w.normalized_headword AS word
         FROM daily_set s
         JOIN daily_set_word d ON d.set_id = s.id
         JOIN word w ON w.id = d.word_id
         ORDER BY s.local_date, d.display_order`
      ),
      db.execute(
        `SELECT w.normalized_headword AS word, r.state, r.step, r.due_at, r.last_reviewed_at
         FROM review_state r JOIN word w ON w.id = r.word_id ORDER BY w.id`
      ),
      db.execute(
        `SELECT w.normalized_headword AS word, a.activity_type, a.result, a.rating, a.answered_at
         FROM review_attempt a JOIN word w ON w.id = a.word_id ORDER BY a.id`
      ),
      db.execute(
        `SELECT w.normalized_headword AS word, n.note, n.favorite, n.tags, n.updated_at
         FROM user_word_note n JOIN word w ON w.id = n.word_id ORDER BY w.id`
      ),
      db.execute(
        `SELECT act.slug AS activity, a.response, a.result, a.completed_at
         FROM activity_attempt a JOIN activity act ON act.id = a.activity_id ORDER BY a.id`
      ),
      db.execute(
        `SELECT w.normalized_headword AS word, i.field, i.comment, i.created_at, i.resolved
         FROM issue_report i LEFT JOIN word w ON w.id = i.word_id ORDER BY i.id`
      ),
      db.execute('SELECT key, value FROM setting ORDER BY key')
    ])

  /** @type {Map<string, { date: string, timezone: string, words: string[] }>} */
  const grouped = new Map()
  for (const r of sets.rows) {
    const date = String(r.date)
    const entry = grouped.get(date) ?? { date, timezone: String(r.timezone), words: [] }
    entry.words.push(String(r.word))
    grouped.set(date, entry)
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    ledger: ledger.rows.map((r) => ({ word: String(r.word), date: String(r.date) })),
    dailySets: [...grouped.values()],
    reviewStates: states.rows.map((r) => ({
      word: String(r.word),
      state: String(r.state),
      step: Number(r.step),
      dueAt: str(r.due_at),
      lastReviewedAt: str(r.last_reviewed_at)
    })),
    reviewAttempts: attempts.rows.map((r) => ({
      word: String(r.word),
      activityType: String(r.activity_type),
      result: String(r.result),
      rating: str(r.rating),
      answeredAt: String(r.answered_at)
    })),
    notes: notes.rows.map((r) => ({
      word: String(r.word),
      note: String(r.note),
      favorite: Number(r.favorite) === 1,
      tags: String(r.tags),
      updatedAt: String(r.updated_at)
    })),
    activityAttempts: activityAttempts.rows.map((r) => ({
      activity: String(r.activity),
      response: str(r.response),
      result: str(r.result),
      completedAt: String(r.completed_at)
    })),
    issues: issues.rows.map((r) => ({
      word: str(r.word),
      field: str(r.field),
      comment: str(r.comment),
      createdAt: String(r.created_at),
      resolved: Number(r.resolved) === 1
    })),
    settings: Object.fromEntries(
      settings.rows
        .filter((r) => !INTERNAL_SETTINGS.includes(String(r.key)))
        .map((r) => [String(r.key), String(r.value)])
    )
  }
}

/** @typedef {Awaited<ReturnType<typeof buildBackup>>} Backup */

/**
 * @param {unknown} b
 * @returns {string[]} problems; empty means the file looks like a usable backup
 */
export function validateBackup(b) {
  /** @type {string[]} */
  const errors = []
  const o = /** @type {Record<string, any>} */ (b)
  if (!o || typeof o !== 'object') return ['This file is not a backup.']
  if (o.format !== BACKUP_FORMAT) errors.push('This is not a Mind Studio backup file.')
  if (o.version !== BACKUP_VERSION)
    errors.push(
      `Unsupported backup version: ${String(o.version)} (this app reads ${BACKUP_VERSION}).`
    )
  for (const key of [
    'ledger',
    'dailySets',
    'reviewStates',
    'reviewAttempts',
    'notes',
    'activityAttempts',
    'issues'
  ])
    if (!Array.isArray(o[key])) errors.push(`Missing list: ${key}.`)
  if (!o.settings || typeof o.settings !== 'object') errors.push('Missing settings.')
  return errors
}

/**
 * Replace the learner's progress with the contents of a backup, atomically: either everything
 * is restored or nothing changes. Words the app does not know are skipped and counted.
 * @param {Client} db
 * @param {Backup} backup
 */
export async function importBackup(db, backup) {
  const problems = validateBackup(backup)
  if (problems.length) throw new Error(problems.join(' '))

  const known = new Set(
    (await db.execute('SELECT normalized_headword FROM word')).rows.map((r) =>
      String(r.normalized_headword)
    )
  )
  let skipped = 0
  /** @param {string | null} word */
  const knows = (word) => {
    if (word && known.has(word)) return true
    skipped++
    return false
  }

  /** @type {Statement[]} */
  const stmts = [
    { sql: 'DELETE FROM daily_set_word', args: [] },
    { sql: 'DELETE FROM daily_set', args: [] },
    { sql: 'DELETE FROM featured_ledger', args: [] },
    { sql: 'DELETE FROM review_attempt', args: [] },
    { sql: 'DELETE FROM review_state', args: [] },
    { sql: 'DELETE FROM user_word_note', args: [] },
    { sql: 'DELETE FROM activity_attempt', args: [] },
    { sql: 'DELETE FROM issue_report', args: [] },
    {
      sql: `DELETE FROM setting WHERE key NOT IN (${INTERNAL_SETTINGS.map(() => '?').join(',')})`,
      args: INTERNAL_SETTINGS
    }
  ]
  const byWord = (
    /** @type {string} */ select,
    /** @type {any[]} */ args,
    /** @type {string} */ word
  ) =>
    stmts.push({ sql: `${select} FROM word WHERE normalized_headword = ?`, args: [...args, word] })

  for (const l of backup.ledger)
    if (knows(l.word))
      byWord(
        'INSERT INTO featured_ledger (word_id, first_featured_date) SELECT id, ?',
        [l.date],
        l.word
      )

  for (const s of backup.dailySets) {
    stmts.push({
      sql: 'INSERT INTO daily_set (local_date, timezone) VALUES (?, ?)',
      args: [s.date, s.timezone]
    })
    s.words.forEach((word, i) => {
      if (!knows(word)) return
      stmts.push({
        sql: `INSERT INTO daily_set_word (set_id, word_id, display_order)
              SELECT s.id, w.id, ? FROM daily_set s, word w
              WHERE s.local_date = ? AND w.normalized_headword = ?`,
        args: [i + 1, s.date, word]
      })
    })
  }

  for (const r of backup.reviewStates)
    if (knows(r.word))
      byWord(
        'INSERT INTO review_state (word_id, state, step, due_at, last_reviewed_at) SELECT id, ?, ?, ?, ?',
        [r.state, r.step, r.dueAt, r.lastReviewedAt],
        r.word
      )

  for (const a of backup.reviewAttempts)
    if (knows(a.word))
      byWord(
        'INSERT INTO review_attempt (word_id, activity_type, result, rating, answered_at) SELECT id, ?, ?, ?, ?',
        [a.activityType, a.result, a.rating, a.answeredAt],
        a.word
      )

  for (const n of backup.notes)
    if (knows(n.word))
      byWord(
        'INSERT INTO user_word_note (word_id, note, favorite, tags, updated_at) SELECT id, ?, ?, ?, ?',
        [n.note, n.favorite ? 1 : 0, n.tags, n.updatedAt],
        n.word
      )

  for (const a of backup.activityAttempts)
    stmts.push({
      sql: `INSERT INTO activity_attempt (activity_id, response, result, completed_at)
            SELECT id, ?, ?, ? FROM activity WHERE slug = ?`,
      args: [a.response, a.result, a.completedAt, a.activity]
    })

  for (const i of backup.issues)
    stmts.push({
      sql: `INSERT INTO issue_report (word_id, field, comment, created_at, resolved)
            VALUES ((SELECT id FROM word WHERE normalized_headword = ?), ?, ?, ?, ?)`,
      args: [i.word, i.field, i.comment, i.createdAt, i.resolved ? 1 : 0]
    })

  for (const [key, value] of Object.entries(backup.settings))
    if (!INTERNAL_SETTINGS.includes(key))
      stmts.push({
        sql: `INSERT INTO setting (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        args: [key, String(value)]
      })

  await db.batch(stmts, 'write')
  return {
    words: backup.ledger.length,
    reviews: backup.reviewAttempts.length,
    notes: backup.notes.length,
    skippedUnknown: skipped
  }
}

// ---------------------------------------------------------------------------------------------
// Wordbook export (CSV and JSON): a readable table of every featured word.
// ---------------------------------------------------------------------------------------------

/** UTF-8 byte order mark, so Excel opens accented text correctly. */
const BOM = String.fromCharCode(0xfeff)

export const WORDBOOK_COLUMNS = [
  'headword',
  'part_of_speech',
  'topic',
  'definition',
  'register',
  'etymology',
  'etymology_confidence',
  'sources',
  'first_featured',
  'learning_state',
  'due',
  'favorite',
  'tags',
  'note'
]

/**
 * @param {Client} db
 * @returns {Promise<Record<string, string | number | boolean>[]>}
 */
export async function buildWordbookRows(db) {
  const words = await db.execute(
    `SELECT w.id, w.display_headword, w.pos, w.topic, w.confidence, c.data, f.first_featured_date,
            COALESCE(rs.state, 'new') AS state, rs.due_at,
            COALESCE(n.favorite, 0) AS favorite, COALESCE(n.tags, '') AS tags,
            COALESCE(n.note, '') AS note
     FROM featured_ledger f
     JOIN word w ON w.id = f.word_id
     JOIN word_content c ON c.word_id = w.id
     LEFT JOIN review_state rs ON rs.word_id = w.id
     LEFT JOIN user_word_note n ON n.word_id = w.id
     ORDER BY f.first_featured_date, w.id`
  )
  const sources = await db.execute(
    'SELECT word_id, name, url, license FROM word_source ORDER BY word_id, id'
  )
  /** @type {Map<number, string[]>} */
  const byWord = new Map()
  for (const s of sources.rows) {
    const id = Number(s.word_id)
    const label = `${s.name} <${s.url}>${s.license ? ` (${s.license})` : ''}`
    byWord.set(id, [...(byWord.get(id) ?? []), label])
  }

  return words.rows.map((r) => {
    const content = JSON.parse(String(r.data))
    return {
      headword: String(r.display_headword),
      part_of_speech: String(r.pos),
      topic: String(r.topic),
      definition: String(content.definition ?? ''),
      register: String(content.register ?? ''),
      etymology: String(content.etymology?.summary ?? ''),
      etymology_confidence: String(r.confidence),
      sources: (byWord.get(Number(r.id)) ?? []).join(' | '),
      first_featured: String(r.first_featured_date),
      learning_state: String(r.state),
      due: r.due_at === null ? '' : String(r.due_at),
      favorite: Number(r.favorite) === 1,
      tags: String(r.tags),
      note: String(r.note)
    }
  })
}

/**
 * One CSV field. Quotes when needed, and defuses spreadsheet formulas (a leading equals, plus, minus or at sign) so a
 * note cannot run as a formula when the file is opened in Excel or Sheets.
 * @param {unknown} value
 */
function csvField(value) {
  let s = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} [columns]
 */
export function toCsv(rows, columns = WORDBOOK_COLUMNS) {
  const lines = [columns.join(',')]
  for (const row of rows) lines.push(columns.map((c) => csvField(row[c])).join(','))
  // UTF-8 byte order mark so Excel opens accented text correctly.
  return `${BOM}${lines.join('\r\n')}\r\n`
}
