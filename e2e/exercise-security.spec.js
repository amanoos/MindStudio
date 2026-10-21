import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { login } from './helpers.js'

/*
 * Word Nuance, hostile and keyboard-only: model text that contains markup must stay text, the key
 * must never leave the browser except to Anthropic, no content-policy violation may occur, and the
 * whole exercise must work and pass axe without a mouse.
 */

const KEY = 'sk-ant-api03-e2e-secret-key-9876'
const EVIL = '<img src=x onerror="window.__pwned = true"><script>window.__pwned = true</script>'

test.use({ reducedMotion: 'reduce' })

/** @param {import('@playwright/test').Page} page */
async function mockEvilClaude(page) {
  await page.route('https://api.anthropic.com/**', async (route) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const item = {
      passage: `She gave a _____ answer. ${EVIL}`,
      options: ['scathing', 'gentle', 'mild', 'kind'],
      correct_index: 0,
      reason: `Because ${EVIL} is not a reason.`,
      option_notes: [EVIL, 'b', 'c', 'd']
    }
    return route.fulfill({
      status: 200,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: JSON.stringify(item) }]
      })
    })
  })
}

for (const theme of ['light', 'dark']) {
  test(`keyboard-only exercise with hostile text, ${theme} theme`, async ({ page }) => {
    /** @type {string[]} */
    const problems = []
    const toOurServer = /** @type {string[]} */ ([])
    page.on('console', (m) => {
      if (/content security policy|refused to/i.test(m.text())) problems.push(m.text())
    })
    page.on('pageerror', (e) => problems.push(e.message))
    page.on('request', (req) => {
      const host = new URL(req.url()).hostname
      if (host === 'localhost' || host === '127.0.0.1')
        toOurServer.push(`${req.url()} ${JSON.stringify(req.headers())} ${req.postData() ?? ''}`)
    })
    page.on('dialog', (d) => {
      problems.push(`dialog: ${d.message()}`)
      void d.dismiss()
    })
    await mockEvilClaude(page)
    await login(page)
    await page.goto('/exercise')
    await page.evaluate(
      ([k, t]) => {
        localStorage.setItem('mind-studio.claude-key', k)
        localStorage.setItem('theme', t)
      },
      [KEY, theme]
    )
    await page.goto('/exercise/word-nuance')
    await page.getByRole('tab', { name: 'Type a word' }).click()

    // Type the word and generate using only the keyboard.
    await page.getByLabel('Any word you like').focus()
    await page.keyboard.type('scathing')
    const go = page.getByRole('button', { name: 'Write one for me' })
    await go.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('img', { name: 'blank' })).toBeVisible()

    // The markup is shown as text and nothing ran.
    await expect(page.locator('.passage')).toContainText('<img src=x onerror=')
    expect(await page.locator('.passage img, .passage script').count()).toBe(0)
    expect(await page.evaluate(() => /** @type {any} */ (window).__pwned)).toBeUndefined()

    // Answer with the keyboard.
    const first = page
      .getByRole('group', { name: 'Which word fits best?' })
      .getByRole('button', { name: 'scathing' })
    await first.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Yes, that is the best fit!')).toBeVisible()
    await expect(page.locator('.reveal')).toContainText('<img src=x onerror=')
    expect(await page.locator('.reveal img, .reveal script').count()).toBe(0)
    expect(await page.evaluate(() => /** @type {any} */ (window).__pwned)).toBeUndefined()

    const results = await new AxeBuilder({ page }).analyze()
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([])

    // Flag it, still by keyboard.
    const flag = page.getByRole('button', { name: 'This item seems unclear' })
    await flag.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Marked as unclear, thank you')).toBeVisible()

    expect(problems).toEqual([])
    expect(toOurServer.some((r) => r.includes(KEY))).toBe(false)
    await page.evaluate(() => localStorage.removeItem('theme'))
  })
}
