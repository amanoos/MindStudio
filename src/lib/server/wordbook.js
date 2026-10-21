/** Escape LIKE wildcards in user input. @param {string} s */
const esc = (s) => s.replace(/[\\%_]/g, '\\$&')

const SORTS = {
  newest: 'f.first_featured_date DESC, w.id DESC',
  az: 'w.display_headword COLLATE NOCASE ASC',
  due: "COALESCE(rs.due_at, '') ASC, w.id ASC"
}

/** @typedef {keyof typeof SORTS} WordbookSort */
/**
 * @typedef {{
 *   q?: string, topic?: string, state?: string, favorites?: boolean, tag?: string,
 *   from?: string, to?: string, sort?: string
 * }} WordbookFilters
 */

/**
 * Search the learner's featured words. Words not yet shown are never listed.
 * @param {import('@libsql/client').Client} db
 * @param {WordbookFilters} [filters]
 */
export async function searchWordbook(db, filters = {}) {
  const { q, topic, state, favorites, tag, from, to } = filters
  const sort = /** @type {WordbookSort} */ (
    filters.sort && filters.sort in SORTS ? filters.sort : 'newest'
  )

  /** @type {string[]} */
  const where = []
  /** @type {(string | number)[]} */
  const args = []

  if (q?.trim()) {
    const like = `%${esc(q.trim())}%`
    where.push(`(w.display_headword LIKE ? ESCAPE '\\'
              OR json_extract(c.data, '$.definition') LIKE ? ESCAPE '\\'
              OR COALESCE(n.note, '') LIKE ? ESCAPE '\\'
              OR COALESCE(n.tags, '') LIKE ? ESCAPE '\\')`)
    args.push(like, like, like, like)
  }
  if (topic) {
    where.push('w.topic = ?')
    args.push(topic)
  }
  if (state) {
    where.push("COALESCE(rs.state, 'new') = ?")
    args.push(state)
  }
  if (favorites) where.push('COALESCE(n.favorite, 0) = 1')
  if (tag?.trim()) {
    where.push("COALESCE(n.tags, '') LIKE ? ESCAPE '\\'")
    args.push(`%${esc(tag.trim().toLowerCase())}%`)
  }
  if (from) {
    where.push('f.first_featured_date >= ?')
    args.push(from)
  }
  if (to) {
    where.push('f.first_featured_date <= ?')
    args.push(to)
  }

  const res = await db.execute({
    sql: `SELECT w.id, w.slug, w.display_headword, w.pos, w.topic, w.confidence,
                 json_extract(c.data, '$.definition') AS definition,
                 f.first_featured_date,
                 COALESCE(rs.state, 'new') AS state, rs.due_at,
                 COALESCE(n.favorite, 0) AS favorite, COALESCE(n.tags, '') AS tags,
                 COALESCE(n.note, '') <> '' AS has_note
          FROM featured_ledger f
          JOIN word w ON w.id = f.word_id
          JOIN word_content c ON c.word_id = w.id
          LEFT JOIN review_state rs ON rs.word_id = w.id
          LEFT JOIN user_word_note n ON n.word_id = w.id
          ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
          ORDER BY ${SORTS[sort]}`,
    args
  })

  return res.rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    headword: String(r.display_headword),
    pos: String(r.pos),
    topic: String(r.topic),
    confidence: /** @type {'sourced' | 'uncertain'} */ (String(r.confidence)),
    definition: String(r.definition ?? ''),
    firstFeatured: String(r.first_featured_date),
    state: String(r.state),
    dueAt: r.due_at === null ? null : String(r.due_at),
    favorite: Number(r.favorite) === 1,
    tags: String(r.tags),
    hasNote: Number(r.has_note) === 1
  }))
}

/**
 * Topics among the featured words, for the filter menu.
 * @param {import('@libsql/client').Client} db
 */
export async function listFeaturedTopics(db) {
  const res = await db.execute(
    `SELECT DISTINCT w.topic FROM featured_ledger f JOIN word w ON w.id = f.word_id ORDER BY w.topic`
  )
  return res.rows.map((r) => String(r.topic))
}
