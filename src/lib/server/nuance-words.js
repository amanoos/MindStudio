/**
 * Which words Word Nuance can use: words the learner has already met (so nothing unseen is spoiled),
 * with their stored related words, or a word typed in by hand.
 */

/** @typedef {import('@libsql/client').Client} Client */

/**
 * Words that have been featured, alphabetical, with their stored related words.
 * @param {Client} db
 * @returns {Promise<{ headword: string, slug: string, related: string[] }[]>}
 */
export async function listNuanceWords(db) {
  const rows = (
    await db.execute(
      `SELECT w.display_headword AS headword, w.slug AS slug, c.data AS data
       FROM featured_ledger f
       JOIN word w ON w.id = f.word_id
       JOIN word_content c ON c.word_id = w.id
       ORDER BY w.display_headword COLLATE NOCASE`
    )
  ).rows
  return rows.map((r) => {
    /** @type {{ synonyms?: { word?: string }[] }} */
    const data = JSON.parse(String(r.data))
    const related = (data.synonyms ?? []).map((s) => String(s?.word ?? '').trim()).filter(Boolean)
    return { headword: String(r.headword), slug: String(r.slug), related }
  })
}
