import { describe, it, expect } from 'vitest'
import { testDb, insertWord } from './helpers.js'
import { migrate } from '../src/lib/server/db.js'

describe('database', () => {
  it('applies migrations once and is idempotent', async () => {
    const db = await testDb()
    expect(await migrate(db)).toEqual([])
    const tables = (await db.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(
      (r) => r.name
    )
    expect(tables).toEqual(expect.arrayContaining(['word', 'daily_set', 'featured_ledger']))
  })

  it('rejects a duplicate normalized headword at the database level', async () => {
    const db = await testDb()
    await insertWord(db, 'Sanguine')
    await expect(
      db.execute({
        sql: `INSERT INTO word (normalized_headword, display_headword, slug, pos, topic, confidence)
              VALUES ('sanguin', 'sanguine again', 'other-slug', 'adjective', 'general', 'sourced')`,
        args: []
      })
    ).rejects.toThrow(/UNIQUE/i)
  })

  it('rejects a second daily set for the same local date', async () => {
    const db = await testDb()
    await db.execute("INSERT INTO daily_set (local_date, timezone) VALUES ('2026-10-20', 'UTC')")
    await expect(
      db.execute("INSERT INTO daily_set (local_date, timezone) VALUES ('2026-10-20', 'UTC')")
    ).rejects.toThrow(/UNIQUE/i)
  })
})
