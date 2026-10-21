/**
 * @typedef {import('@libsql/client').Client} Client
 * @typedef {{ name: string, url: string, field: string, license: string | null, attribution: string | null }} SourceRow
 */

/**
 * Words the learner has been shown. Future words are never exposed, so nothing is spoiled.
 * @param {Client} db
 * @param {string} slug
 */
export async function getFeaturedWord(db, slug) {
  const res = await db.execute({
    sql: `SELECT w.id, w.slug, w.display_headword, w.pos, w.topic, w.confidence, c.data,
                 f.first_featured_date,
                 COALESCE(n.note, '') AS note, COALESCE(n.favorite, 0) AS favorite,
                 COALESCE(n.tags, '') AS tags,
                 rs.state, rs.step, rs.due_at
          FROM word w
          JOIN featured_ledger f ON f.word_id = w.id
          JOIN word_content c ON c.word_id = w.id
          LEFT JOIN user_word_note n ON n.word_id = w.id
          LEFT JOIN review_state rs ON rs.word_id = w.id
          WHERE w.slug = ?`,
    args: [slug]
  })
  const r = res.rows[0]
  if (!r) return null

  const sources = await db.execute({
    sql: 'SELECT name, url, field, license, attribution FROM word_source WHERE word_id = ? ORDER BY id',
    args: [Number(r.id)]
  })

  return {
    id: Number(r.id),
    slug: String(r.slug),
    headword: String(r.display_headword),
    pos: String(r.pos),
    topic: String(r.topic),
    confidence: /** @type {'sourced' | 'uncertain'} */ (String(r.confidence)),
    firstFeatured: String(r.first_featured_date),
    content: JSON.parse(String(r.data)),
    sources: /** @type {SourceRow[]} */ (
      sources.rows.map((s) => ({
        name: String(s.name),
        url: String(s.url),
        field: String(s.field),
        license: s.license === null ? null : String(s.license),
        attribution: s.attribution === null ? null : String(s.attribution)
      }))
    ),
    note: { text: String(r.note), favorite: Number(r.favorite) === 1, tags: String(r.tags) },
    review: {
      state: String(r.state ?? 'new'),
      step: Number(r.step ?? 0),
      dueAt: r.due_at === null || r.due_at === undefined ? null : String(r.due_at)
    }
  }
}

/**
 * Every featured word with its content. Used as the distractor pool for review questions.
 * @param {Client} db
 */
export async function getFeaturedWords(db) {
  const res = await db.execute(
    `SELECT w.id, w.slug, w.display_headword, w.pos, w.topic, c.data
     FROM featured_ledger f
     JOIN word w ON w.id = f.word_id
     JOIN word_content c ON c.word_id = w.id
     ORDER BY f.first_featured_date, w.id`
  )
  return res.rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    headword: String(r.display_headword),
    pos: String(r.pos),
    topic: String(r.topic),
    content: JSON.parse(String(r.data))
  }))
}
