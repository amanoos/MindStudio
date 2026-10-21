import { E2E_PASSCODE } from '../playwright.config.js'

/** Sign in through the real login form. @param {import('@playwright/test').Page} page */
export async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Passcode').fill(E2E_PASSCODE)
  await page.getByRole('button', { name: 'Let me in' }).click()
  await page.waitForURL('/')
  await page.getByRole('heading', { level: 1 }).waitFor()
}

/** The slug of the first word card on Today. @param {import('@playwright/test').Page} page */
export async function firstWordSlug(page) {
  await page.goto('/')
  const href = await page.locator('ol.words a.stretch').first().getAttribute('href')
  return String(href).split('/').pop() ?? ''
}
