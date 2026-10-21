import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

const KEY = 'sk-ant-api03-e2e-secret-key-9876'

test.use({ reducedMotion: 'reduce' })

test('the Claude key is saved, tested and removed in the browser only', async ({ page }) => {
  /** @type {string[]} */
  const toOurServer = []
  /** @type {import('@playwright/test').Request[]} */
  const toAnthropic = []
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.hostname === 'api.anthropic.com') toAnthropic.push(req)
    else if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      toOurServer.push(`${req.url()}\n${JSON.stringify(req.headers())}\n${req.postData() ?? ''}`)
    }
  })
  await page.route('https://api.anthropic.com/**', async (route) => {
    const method = route.request().method()
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'POST, OPTIONS'
    }
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    return route.fulfill({
      status: 200,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ready' }] })
    })
  })

  await login(page)
  await page.goto('/exercise')
  await expect(page.getByRole('heading', { level: 1, name: 'Exercise' })).toBeVisible()
  await expect(page.getByText('Needs your Claude key')).toBeVisible()

  // Wrong shapes are refused before anything is stored.
  await page.getByLabel('Claude API key').fill('hello there')
  await page.getByRole('button', { name: 'Save key' }).click()
  await expect(page.getByRole('status')).toContainText('no spaces')
  expect(await page.evaluate(() => localStorage.length)).toBe(0)

  await page.getByLabel('Claude API key').fill(KEY)
  await page.getByRole('button', { name: 'Save key' }).click()
  await expect(page.getByText('ending')).toBeVisible()
  await expect(page.getByText('9876', { exact: false })).toBeVisible()
  await expect(page.getByText('Ready to play')).toBeVisible()
  expect(await page.evaluate(() => Object.values(localStorage).join())).toContain(KEY)
  // The page never prints the whole key.
  expect(await page.locator('body').innerText()).not.toContain(KEY)

  await page.getByRole('button', { name: 'Test connection' }).click()
  await expect(page.getByRole('status')).toContainText('Connected')
  const sent = toAnthropic.find((r) => r.method() === 'POST')
  expect(sent?.headers()['x-api-key']).toBe(KEY)
  expect(sent?.headers()['anthropic-dangerous-direct-browser-access']).toBe('true')
  expect(sent?.postDataJSON().model).toBe('claude-sonnet-5-5')

  // It survives a reload, then goes away on Remove.
  await page.reload()
  await expect(page.getByText('ending')).toBeVisible()
  await page.getByRole('button', { name: 'Remove key' }).click()
  await expect(page.getByLabel('Claude API key')).toBeVisible()
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('key')))
  ).toEqual([])

  // At no point did the key travel to our own server.
  expect(toOurServer.length).toBeGreaterThan(0)
  expect(toOurServer.some((r) => r.includes(KEY))).toBe(false)
})

test('a rejected key shows a friendly message', async ({ page }) => {
  await page.route('https://api.anthropic.com/**', async (route) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    return route.fulfill({
      status: 401,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'error',
        error: { type: 'authentication_error', message: 'invalid x-api-key' }
      })
    })
  })
  await login(page)
  await page.goto('/exercise')
  await page.getByLabel('Claude API key').fill(KEY)
  await page.getByRole('button', { name: 'Save key' }).click()
  await page.getByRole('button', { name: 'Test connection' }).click()
  await expect(page.getByRole('status')).toContainText('did not accept this key')
  await page.getByRole('button', { name: 'Remove key' }).click()
})

test('the seven-item navigation fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await login(page)
  await page.goto('/exercise')
  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav.getByRole('link')).toHaveCount(7)
  const box = await nav.boundingBox()
  expect(box?.width).toBeLessThanOrEqual(375)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  expect(overflow).toBe(false)
  for (const link of await nav.getByRole('link').all()) {
    const b = await link.boundingBox()
    expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(376)
    expect(b?.x ?? -1).toBeGreaterThanOrEqual(0)
  }
  await page.screenshot({ path: 'test-results/mobile-nav.png' })
})
