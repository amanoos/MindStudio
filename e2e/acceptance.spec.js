import { test, expect } from '@playwright/test'
import { E2E_PASSCODE } from '../playwright.config.js'
import { join } from 'node:path'
import { loadWordFiles } from '../src/lib/server/content.js'
import { normalizeHeadword, slugify } from '../src/lib/server/normalize.js'
import { login } from './helpers.js'

/**
 * The acceptance criteria from PRD section 16, each exercised through the real app in a real
 * browser. Tests share one database and run in order.
 */
test.describe.configure({ mode: 'serial' })
test.use({ reducedMotion: 'reduce' })

/** @param {import('@playwright/test').Page} page */
const todaysWords = async (page) => {
  await page.goto('/')
  await expect(page.locator('ol.words li')).toHaveCount(5)
  return page.locator('ol.words h2').allTextContents()
}

/** @param {import('@playwright/test').Page} page */
const wordbookHeadwords = async (page) => {
  await page.goto('/wordbook')
  await page.getByRole('heading', { level: 1 }).waitFor()
  return page.locator('ul.results h2 a').allTextContents()
}

test('only the signed-in learner gets in', async ({ page, browser }) => {
  const fresh = await browser.newContext()
  const anon = await fresh.newPage()
  await anon.goto('/')
  await expect(anon).toHaveURL(/\/login$/)
  await anon.getByLabel('Passcode').fill('definitely-wrong')
  await anon.getByRole('button', { name: 'Let me in' }).click()
  await expect(anon.getByText('That passcode did not match')).toBeVisible()
  await fresh.close()

  await login(page)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/five words|All five/)
  expect(E2E_PASSCODE.length).toBeGreaterThan(0)
})

test('the same five words stay assigned for the whole local date', async ({ page, browser }) => {
  await login(page)
  const first = await todaysWords(page)
  await page.reload()
  expect(await todaysWords(page)).toEqual(first)

  // A different browser session, signed in separately, sees the same five.
  const other = await browser.newContext({ reducedMotion: 'reduce' })
  const second = await other.newPage()
  await login(second)
  expect(await todaysWords(second)).toEqual(first)
  await other.close()
})

test('everything works with no outside services: the app makes no external requests', async ({
  page,
  baseURL
}) => {
  /** @type {string[]} */
  const external = []
  page.on('request', (req) => {
    const url = req.url()
    if (!url.startsWith(String(baseURL)) && !url.startsWith('data:') && !url.startsWith('blob:'))
      external.push(url)
  })
  await login(page)
  const slug = String(await page.locator('ol.words a.stretch').first().getAttribute('href'))
    .split('/')
    .pop()
  for (const route of ['/', `/word/${slug}`, '/review', '/wordbook', '/studio', '/progress']) {
    await page.goto(route)
    await page.getByRole('heading', { level: 1 }).first().waitFor()
  }
  expect(external).toEqual([])
})

test('sources and their attribution are shown with the word history', async ({ page }) => {
  await login(page)
  await page.locator('ol.words a.stretch').first().click()
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()

  const links = page.locator('ul.sources a')
  expect(await links.count()).toBeGreaterThanOrEqual(3)
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute('href', /^https:\/\//)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)
  }
  // License and attribution travel with the data they apply to.
  await expect(page.locator('ul.sources')).toContainText('CC BY-SA 4.0')
  await expect(page.locator('ul.sources')).toContainText('Linked, not reproduced')
  await expect(page.getByText('About our sources')).toBeVisible()
})

test('rating a word Again brings its review forward to minutes, not days', async ({ page }) => {
  await login(page)
  await page.goto('/review')
  await expect(page.getByText(/Question 1 of/)).toBeVisible()

  const headword = await page.locator('h2.word, h2.prompt').first().textContent()
  expect(headword).toBeTruthy()

  if (await page.getByRole('button', { name: 'Show the meaning' }).count())
    await page.getByRole('button', { name: 'Show the meaning' }).click()
  else if (await page.locator('#answer').count()) {
    await page.locator('#answer').fill('zzz')
    await page.getByRole('button', { name: 'Check' }).click()
  } else await page.locator('button.opt').first().click()

  await page.getByRole('button', { name: /^Again/ }).click()
  await expect(page.getByText(/Question 2 of|Session complete/)).toBeVisible()

  const backup = await (await page.request.get('/export/backup.json')).json()
  const again = backup.reviewAttempts.find(
    /** @param {{ rating: string }} a */ (a) => a.rating === 'again'
  )
  expect(again).toBeTruthy()
  const state = backup.reviewStates.find(
    /** @param {{ word: string }} s */ (s) => s.word === again.word
  )
  expect(state.step).toBe(0)
  const minutes = (Date.parse(state.dueAt) - Date.now()) / 60_000
  expect(minutes).toBeGreaterThan(0)
  expect(minutes).toBeLessThan(30)
})

test('export includes headwords, metadata, sources, notes and learning states', async ({
  page
}) => {
  await login(page)
  await page.locator('ol.words a.stretch').first().click()
  const headword = (await page.locator('h1.headword').textContent()) ?? ''
  await page.locator('#note').fill('Export check, with "quotes", and a comma.')
  await page.locator('#tags').fill('check, export')
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByText('Saved ✓')).toBeVisible()

  const csv = await (await page.request.get('/export/wordbook.csv')).text()
  expect(csv).toContain('headword,part_of_speech,topic,definition')
  expect(csv).toContain(headword)
  expect(csv).toContain('https://')
  expect(csv).toContain('Export check, with ""quotes"", and a comma.')

  const rows = await (await page.request.get('/export/wordbook.json')).json()
  const row = rows.find(/** @param {{ headword: string }} r */ (r) => r.headword === headword)
  expect(row.learning_state).toBeTruthy()
  expect(row.etymology.length).toBeGreaterThan(10)
  expect(row.tags).toBe('check, export')

  const backup = await (await page.request.get('/export/backup.json')).json()
  expect(backup.format).toBe('mind-studio-backup')
  expect(backup.notes.length).toBeGreaterThan(0)
  expect(backup.ledger.length).toBeGreaterThanOrEqual(5)
})

test('changing timezone keeps history, and the new local date gets its own set', async ({
  page
}) => {
  await login(page)
  const before = await wordbookHeadwords(page)

  const setZone = async (/** @type {string} */ zone) => {
    await page.goto('/settings')
    await page.locator('#timezone').selectOption(zone)
    await page.getByRole('button', { name: 'Save' }).first().click()
    await expect(page.getByText('Saved ✓').first()).toBeVisible()
  }

  await setZone('Pacific/Kiritimati')
  const a = await todaysWords(page)
  await setZone('Pacific/Pago_Pago')
  const b = await todaysWords(page)
  // 25 hours apart: the two zones can never share a local date.
  expect(b.some((w) => a.includes(w))).toBe(false)

  const after = await wordbookHeadwords(page)
  for (const word of [...before, ...a, ...b]) expect(after).toContain(word)

  await setZone('UTC')
})

test('an uncertain word history is labeled as uncertain, never presented as settled', async ({
  page
}) => {
  await login(page)
  // Features "elegy" (one of the words whose Greek origin is disputed) by restoring a backup.
  const backup = {
    format: 'mind-studio-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    ledger: [{ word: normalizeHeadword('elegy'), date: '2026-01-01' }],
    dailySets: [],
    reviewStates: [],
    reviewAttempts: [],
    notes: [],
    activityAttempts: [],
    issues: [],
    settings: {}
  }
  await page.goto('/settings')
  await page.locator('#backup').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup))
  })
  await page.getByLabel(/I understand this replaces/).check()
  await page.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByText(/Restored 1 words/)).toBeVisible()

  await page.goto('/word/elegy')
  await expect(page.getByText('History uncertain').first()).toBeVisible()
  await expect(page.getByText(/uncertain and is disputed/)).toBeVisible()

  // The same label appears in the wordbook listing.
  await page.goto('/wordbook')
  await expect(page.locator('ul.results')).toContainText('elegy')
})

test('a word that has not been featured yet is not exposed', async ({ page }) => {
  await login(page)
  // Pick a word from the library that has provably not been featured.
  const featured = await wordbookHeadwords(page)
  const library = await loadWordFiles(join(process.cwd(), 'content', 'words'))
  const unfeatured = library.find(({ word }) => !featured.includes(word.headword))
  if (!unfeatured) throw new Error('every word has been featured')
  const res = await page.goto(`/word/${slugify(unfeatured.word.headword)}`)
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Hoot|nothing here/i)
})
