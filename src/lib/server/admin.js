/** @typedef {import('@libsql/client').Client} Client */

/** @param {Client} db @param {string} sql */
async function count(db, sql) {
  return Number((await db.execute(sql)).rows[0].n)
}

/**
 * What the content admin page shows: the reserve of unused words, open issue reports, integrity
 * checks on the no-repeat rules, and the log of content loads.
 * @param {Client} db
 */
export async function getAdminOverview(db) {
  const [published, featured, reserve, uncertain] = await Promise.all([
    count(db, "SELECT COUNT(*) AS n FROM word WHERE status = 'published'"),
    count(db, 'SELECT COUNT(*) AS n FROM featured_ledger'),
    count(
      db,
      `SELECT COUNT(*) AS n FROM word
       WHERE status = 'published' AND id NOT IN (SELECT word_id FROM featured_ledger)`
    ),
    count(db, "SELECT COUNT(*) AS n FROM word WHERE confidence = 'uncertain'")
  ])

  const byTopic = (
    await db.execute(
      `SELECT topic, COUNT(*) AS n FROM word
       WHERE status = 'published' AND id NOT IN (SELECT word_id FROM featured_ledger)
       GROUP BY topic ORDER BY n DESC, topic`
    )
  ).rows.map((r) => ({ topic: String(r.topic), n: Number(r.n) }))

  const issues = (
    await db.execute(
      `SELECT i.id, i.field, i.comment, i.created_at, i.resolved, w.display_headword, w.slug
       FROM issue_report i LEFT JOIN word w ON w.id = i.word_id
       ORDER BY i.resolved, i.id DESC LIMIT 100`
    )
  ).rows.map((r) => ({
    id: Number(r.id),
    field: String(r.field ?? 'other'),
    comment: String(r.comment ?? ''),
    createdAt: String(r.created_at),
    resolved: Number(r.resolved) === 1,
    headword: r.display_headword === null ? null : String(r.display_headword),
    slug: r.slug === null ? null : String(r.slug)
  }))

  // Integrity audit: the database constraints should make each of these zero. Showing them
  // proves it, and would reveal a problem introduced by a bad restore or a manual edit.
  const [dupKeys, dupFeatured, badSets, orphanLedger, unfeaturedInSet] = await Promise.all([
    count(
      db,
      `SELECT COUNT(*) AS n FROM (
         SELECT normalized_headword FROM word GROUP BY normalized_headword HAVING COUNT(*) > 1)`
    ),
    count(
      db,
      `SELECT COUNT(*) AS n FROM (
         SELECT word_id FROM daily_set_word GROUP BY word_id HAVING COUNT(*) > 1)`
    ),
    count(
      db,
      `SELECT COUNT(*) AS n FROM (
         SELECT set_id FROM daily_set_word GROUP BY set_id HAVING COUNT(*) <> 5)`
    ),
    count(
      db,
      `SELECT COUNT(*) AS n FROM featured_ledger
       WHERE word_id NOT IN (SELECT word_id FROM daily_set_word)`
    ),
    count(
      db,
      `SELECT COUNT(*) AS n FROM daily_set_word
       WHERE word_id NOT IN (SELECT word_id FROM featured_ledger)`
    )
  ])
  const checks = [
    { name: 'No two words share a normalized headword', problems: dupKeys },
    { name: 'No word appears in more than one daily set', problems: dupFeatured },
    { name: 'Every daily set has exactly five words', problems: badSets },
    { name: 'Every featured word is recorded in the ledger', problems: unfeaturedInSet },
    { name: 'Every ledger entry belongs to a daily set', problems: orphanLedger }
  ].map((c) => ({ ...c, ok: c.problems === 0 }))

  const runs = (
    await db.execute(
      'SELECT id, started_at, completed_at, status, detail FROM generation_run ORDER BY id DESC LIMIT 10'
    )
  ).rows.map((r) => ({
    id: Number(r.id),
    startedAt: String(r.started_at),
    status: String(r.status),
    detail: String(r.detail ?? '')
  }))

  return {
    words: { published, featured, reserve, uncertain, byTopic },
    lowReserve: reserve < 5,
    issues,
    openIssues: issues.filter((i) => !i.resolved).length,
    checks,
    allClear: checks.every((c) => c.ok),
    runs
  }
}

/**
 * @param {Client} db
 * @param {number} id
 * @param {boolean} resolved
 */
export async function setIssueResolved(db, id, resolved) {
  await db.execute({
    sql: 'UPDATE issue_report SET resolved = ? WHERE id = ?',
    args: [resolved ? 1 : 0, id]
  })
}

/**
 * Record that content was loaded, for the admin log.
 * @param {Client} db
 * @param {string} status
 * @param {string} detail
 */
export async function logRun(db, status, detail) {
  await db.execute({
    sql: `INSERT INTO generation_run (status, detail, completed_at) VALUES (?, ?, datetime('now'))`,
    args: [status, detail]
  })
}
