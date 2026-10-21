const MAX_NOTE = 4000
const MAX_TAGS = 10
const MAX_TAG_LENGTH = 30

/**
 * Comma-separated tags to a clean, deduplicated, lower-case list.
 * @param {string} raw
 */
export function parseTags(raw) {
  const tags = raw
    .split(',')
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter((t) => t.length > 0)
    .map((t) => t.slice(0, MAX_TAG_LENGTH))
  return [...new Set(tags)].slice(0, MAX_TAGS)
}

/**
 * Save the note and tags for a featured word. Leaves the favorite flag alone.
 * @param {import('@libsql/client').Client} db
 * @param {number} wordId
 * @param {{ note: string, tags: string }} input
 */
export async function saveNote(db, wordId, { note, tags }) {
  await db.execute({
    sql: `INSERT INTO user_word_note (word_id, note, tags, updated_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(word_id) DO UPDATE SET
            note = excluded.note, tags = excluded.tags, updated_at = datetime('now')`,
    args: [wordId, note.slice(0, MAX_NOTE), parseTags(tags).join(', ')]
  })
}

/**
 * @param {import('@libsql/client').Client} db
 * @param {number} wordId
 * @param {boolean} favorite
 */
export async function setFavorite(db, wordId, favorite) {
  await db.execute({
    sql: `INSERT INTO user_word_note (word_id, favorite, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(word_id) DO UPDATE SET favorite = excluded.favorite, updated_at = datetime('now')`,
    args: [wordId, favorite ? 1 : 0]
  })
}
