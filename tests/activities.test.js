import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { testDb } from './helpers.js'
import {
  lintActivities,
  loadActivityFiles,
  validateActivity
} from '../src/lib/server/activity-content.js'
import { bootstrap, seedActivities } from '../src/lib/server/seed.js'
import {
  checkAnswer,
  getActivity,
  getActivityHistory,
  getTypeCounts,
  listActivities,
  pickDaily,
  publicView,
  recordCapsule
} from '../src/lib/server/activities.js'

const dir = join(process.cwd(), 'content', 'activities')

const teaser = () => ({
  slug: 'a-teaser',
  type: 'teaser',
  title: 'A teaser',
  difficulty: 1,
  kind: 'logic',
  prompt: 'Pick the second one.',
  options: ['first', 'second', 'third'],
  answerIndex: 1,
  reasoning: 'It is the second.'
})

async function seeded() {
  const db = await testDb()
  await seedActivities(db, await loadActivityFiles(dir))
  return db
}

describe('activity content rules', () => {
  it('accepts every shipped activity and has a healthy amount of each type', async () => {
    const entries = await loadActivityFiles(dir)
    expect(lintActivities(entries)).toEqual([])
    const count = (/** @type {string} */ t) => entries.filter((e) => e.activity.type === t).length
    expect(count('teaser')).toBeGreaterThanOrEqual(15)
    expect(count('capsule')).toBeGreaterThanOrEqual(12)
    expect(count('critical')).toBeGreaterThanOrEqual(12)
  })

  it('accepts a complete teaser', () => {
    expect(validateActivity(teaser())).toEqual([])
  })

  it('rejects an answer index outside the options, and repeated options', () => {
    expect(validateActivity({ ...teaser(), answerIndex: 5 }).join()).toMatch(/answerIndex/)
    expect(validateActivity({ ...teaser(), options: ['a', 'A', 'b'] }).join()).toMatch(/different/)
    expect(validateActivity({ ...teaser(), options: ['a', 'b'] }).join()).toMatch(/3 to 5/)
  })

  it('requires sources for capsules and critical prompts, with real links', () => {
    const capsule = {
      slug: 'c',
      type: 'capsule',
      title: 'C',
      difficulty: 1,
      area: 'science',
      body: ['One.', 'Two.'],
      keyIdea: 'Idea',
      followUp: 'Why?',
      sources: []
    }
    expect(validateActivity(capsule).join()).toMatch(/source/)
    expect(
      validateActivity({ ...capsule, sources: [{ name: 'x', url: 'javascript:alert(1)' }] }).join()
    ).toMatch(/http/)
    const critical = {
      slug: 'k',
      type: 'critical',
      title: 'K',
      difficulty: 1,
      skill: 'bias',
      scenario: 'S',
      question: 'Q?',
      options: ['a', 'b', 'c'],
      answerIndex: 0,
      explanation: 'E',
      sources: []
    }
    expect(validateActivity(critical).join()).toMatch(/source/)
  })

  it('flags duplicate slugs and blocked terms', () => {
    const errors = lintActivities([
      { file: 'a.json', activity: teaser() },
      { file: 'b.json', activity: teaser() }
    ])
    expect(errors.join()).toMatch(/duplicate slug/)
    expect(validateActivity({ ...teaser(), prompt: 'a spic word' }, ['spic']).join()).toMatch(
      /blocked/
    )
  })
})

describe('seeding activities', () => {
  it('is idempotent and keeps attempt history when content is refreshed', async () => {
    const db = await seeded()
    const entries = await loadActivityFiles(dir)
    const before = await listActivities(db)
    expect(before).toHaveLength(entries.length)

    const target = before.find((a) => a.type === 'teaser')
    if (!target) throw new Error('expected a teaser')
    await checkAnswer(db, target.slug, 0)
    await seedActivities(db, entries)
    const after = await listActivities(db)
    expect(after).toHaveLength(entries.length)
    expect(after.find((a) => a.slug === target.slug)?.attempts).toBe(1)
  })

  it('is seeded together with words at boot', async () => {
    const db = await testDb()
    const first = await bootstrap(db)
    expect(first.skipped).toBe(false)
    expect((await listActivities(db)).length).toBeGreaterThan(30)
    expect((await bootstrap(db)).skipped).toBe(true)
  })
})

describe('playing an activity', () => {
  it('holds back the answer until it is checked', async () => {
    const db = await seeded()
    const [first] = await listActivities(db, { type: 'teaser' })
    const full = await getActivity(db, 'teaser', first.slug)
    expect(full?.data.answerIndex).toBeTypeOf('number')
    const open = publicView(/** @type {any} */ (full))
    expect(open.data).not.toHaveProperty('answerIndex')
    expect(open.data).not.toHaveProperty('reasoning')
    expect(open.data.options.length).toBeGreaterThanOrEqual(3)
  })

  it('never lets a card label or the public view give away a critical prompt', async () => {
    const db = await seeded()
    const entries = await loadActivityFiles(dir)
    const skills = new Map(
      entries
        .filter((e) => e.activity.type === 'critical')
        .map((e) => [e.activity.slug, e.activity.skill])
    )
    for (const a of await listActivities(db, { type: 'critical' })) {
      expect(a.label.toLowerCase()).not.toContain(String(skills.get(a.slug)).toLowerCase())
      const full = await getActivity(db, 'critical', a.slug)
      // Options may name candidate fallacies (that is the question); the skill field must not travel.
      expect(publicView(/** @type {any} */ (full)).data).not.toHaveProperty('skill')
    }
  })

  it('does not find an activity under the wrong type', async () => {
    const db = await seeded()
    const [first] = await listActivities(db, { type: 'teaser' })
    expect(await getActivity(db, 'capsule', first.slug)).toBeNull()
  })

  it('records a correct and an incorrect answer and reveals the reasoning either way', async () => {
    const db = await seeded()
    const [first] = await listActivities(db, { type: 'teaser' })
    const full = await getActivity(db, 'teaser', first.slug)
    const right = full?.data.answerIndex
    const wrong = (right + 1) % full?.data.options.length

    const good = await checkAnswer(db, first.slug, right)
    const bad = await checkAnswer(db, first.slug, wrong)
    expect(good.correct).toBe(true)
    expect(bad.correct).toBe(false)
    expect(bad.answerIndex).toBe(right)
    expect(bad.reveal.length).toBeGreaterThan(20)

    const history = await getActivityHistory(db)
    expect(history.map((h) => h.result).sort()).toEqual(['correct', 'incorrect'])
  })

  it('rejects an impossible choice and answers for capsules', async () => {
    const db = await seeded()
    const [t] = await listActivities(db, { type: 'teaser' })
    const [c] = await listActivities(db, { type: 'capsule' })
    await expect(checkAnswer(db, t.slug, 99)).rejects.toThrow(/Choose/)
    await expect(checkAnswer(db, t.slug, -1)).rejects.toThrow()
    await expect(checkAnswer(db, c.slug, 0)).rejects.toThrow(/no answer/)
    await expect(checkAnswer(db, 'no-such-thing', 0)).rejects.toThrow(/Unknown/)
  })

  it('logs a finished capsule with a trimmed reflection', async () => {
    const db = await seeded()
    const [c] = await listActivities(db, { type: 'capsule' })
    await recordCapsule(db, c.slug, '  I would like a Rosetta Stone for Linear A.  ')
    const [entry] = await getActivityHistory(db)
    expect(entry).toMatchObject({ slug: c.slug, result: 'completed' })
    expect(entry.reflection).toBe('I would like a Rosetta Stone for Linear A.')
  })
})

describe('history, counts and the daily pick', () => {
  it('lists newest attempts first and counts progress per type', async () => {
    const db = await seeded()
    const [a, b] = await listActivities(db, { type: 'teaser' })
    await checkAnswer(db, a.slug, 0, new Date('2026-10-20T10:00:00Z'))
    await checkAnswer(db, b.slug, 0, new Date('2026-10-21T10:00:00Z'))
    const history = await getActivityHistory(db)
    expect(history[0].slug).toBe(b.slug)
    const counts = await getTypeCounts(db)
    expect(counts.find((c) => c.type === 'teaser')?.done).toBe(2)
    expect(counts.find((c) => c.type === 'capsule')?.done).toBe(0)
  })

  it('picks the same activity for a date, rotating type from day to day', async () => {
    const db = await seeded()
    const days = ['2026-10-20', '2026-10-21', '2026-10-22']
    const picks = await Promise.all(days.map((d) => pickDaily(db, d)))
    expect(new Set(picks.map((p) => p?.type)).size).toBe(3)
    expect((await pickDaily(db, '2026-10-20'))?.slug).toBe(picks[0]?.slug)
  })

  it('prefers something not yet tried, and still returns one when everything is done', async () => {
    const db = await seeded()
    const day = '2026-10-20'
    const first = await pickDaily(db, day)
    if (!first) throw new Error('expected a pick')
    // Attempt the pick: the next call for the same date must choose a different, untried one.
    if (first.type === 'capsule') await recordCapsule(db, first.slug, '')
    else await checkAnswer(db, first.slug, 0)
    const second = await pickDaily(db, day)
    expect(second?.slug).not.toBe(first.slug)

    for (const a of await listActivities(db)) {
      if (a.done) continue
      if (a.type === 'capsule') await recordCapsule(db, a.slug, '')
      else await checkAnswer(db, a.slug, 0)
    }
    expect(await pickDaily(db, day)).not.toBeNull()
  })

  it('returns nothing when no activities exist', async () => {
    expect(await pickDaily(await testDb(), '2026-10-20')).toBeNull()
  })
})
