import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { testDb } from './helpers.js'
import { loadWordFiles } from '../src/lib/server/content.js'
import { bootstrap, seedWords } from '../src/lib/server/seed.js'
import { getOrCreateDailySet } from '../src/lib/server/daily/publish.js'
import { reportIssue } from '../src/lib/server/issues.js'
import { getAdminOverview, logRun, setIssueResolved } from '../src/lib/server/admin.js'

async function seeded() {
  const db = await testDb()
  await seedWords(db, await loadWordFiles(join(process.cwd(), 'content', 'words')))
  return db
}

describe('content admin', () => {
  it('reports the reserve of unused words and flags when it runs low', async () => {
    const db = await seeded()
    const fresh = await getAdminOverview(db)
    expect(fresh.words.published).toBe(100)
    expect(fresh.words.reserve).toBe(100)
    expect(fresh.lowReserve).toBe(false)

    await getOrCreateDailySet(db, { now: new Date('2026-10-20T12:00:00Z'), timezone: 'UTC' })
    const used = await getAdminOverview(db)
    expect(used.words.featured).toBe(5)
    expect(used.words.reserve).toBe(95)
    expect(used.words.byTopic.reduce((n, t) => n + t.n, 0)).toBe(95)

    await db.execute(
      "UPDATE word SET status = 'draft' WHERE id IN (SELECT id FROM word WHERE id NOT IN (SELECT word_id FROM featured_ledger) LIMIT 92)"
    )
    expect((await getAdminOverview(db)).lowReserve).toBe(true)
  })

  it('shows a clean integrity audit for a healthy database', async () => {
    const db = await seeded()
    await getOrCreateDailySet(db, { now: new Date('2026-10-20T12:00:00Z'), timezone: 'UTC' })
    const overview = await getAdminOverview(db)
    expect(overview.allClear).toBe(true)
    expect(overview.checks).toHaveLength(5)
  })

  it('notices when the no-repeat records disagree, for example after a bad manual edit', async () => {
    const db = await seeded()
    await getOrCreateDailySet(db, { now: new Date('2026-10-20T12:00:00Z'), timezone: 'UTC' })
    await db.execute(
      'DELETE FROM featured_ledger WHERE word_id = (SELECT word_id FROM featured_ledger LIMIT 1)'
    )
    const overview = await getAdminOverview(db)
    expect(overview.allClear).toBe(false)
    expect(overview.checks.filter((c) => !c.ok).map((c) => c.problems)).toContain(1)
  })

  it('lists issue reports, open first, and lets them be resolved and reopened', async () => {
    const db = await seeded()
    const set = await getOrCreateDailySet(db, {
      now: new Date('2026-10-20T12:00:00Z'),
      timezone: 'UTC'
    })
    await reportIssue(db, set.words[0].id, 'definition', 'Too vague')
    await reportIssue(db, set.words[1].id, 'bogus-field', 'Typo')

    let overview = await getAdminOverview(db)
    expect(overview.openIssues).toBe(2)
    expect(overview.issues[0].headword).toBeTruthy()
    expect(overview.issues.some((i) => i.field === 'other')).toBe(true)

    await setIssueResolved(db, overview.issues[0].id, true)
    overview = await getAdminOverview(db)
    expect(overview.openIssues).toBe(1)
    expect(overview.issues.at(-1)?.resolved).toBe(true)

    await setIssueResolved(db, overview.issues.at(-1)?.id ?? 0, false)
    expect((await getAdminOverview(db)).openIssues).toBe(2)
  })

  it('logs content loads at boot, but not when nothing changed', async () => {
    const db = await testDb()
    await bootstrap(db)
    expect((await getAdminOverview(db)).runs).toHaveLength(1)
    await bootstrap(db)
    expect((await getAdminOverview(db)).runs).toHaveLength(1)
    await logRun(db, 'manual', 'a note')
    const runs = (await getAdminOverview(db)).runs
    expect(runs[0]).toMatchObject({ status: 'manual', detail: 'a note' })
    expect(runs[1].status).toBe('seeded')
  })
})
