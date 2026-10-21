export const ISSUE_FIELDS = [
  'definition',
  'pronunciation',
  'etymology',
  'examples',
  'synonyms',
  'sources',
  'other'
]

const MAX_COMMENT = 1000

/**
 * Store a "Report an issue" submission about a featured word.
 * @param {import('@libsql/client').Client} db
 * @param {number} wordId
 * @param {string} field
 * @param {string} comment
 */
export async function reportIssue(db, wordId, field, comment) {
  const safeField = ISSUE_FIELDS.includes(field) ? field : 'other'
  await db.execute({
    sql: 'INSERT INTO issue_report (word_id, field, comment) VALUES (?, ?, ?)',
    args: [wordId, safeField, comment.trim().slice(0, MAX_COMMENT)]
  })
}
