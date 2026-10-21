import { test, expect } from '@playwright/test'
import { firstWordSlug, login } from './helpers.js'

test('security headers and a strict content policy are sent', async ({ page }) => {
  await login(page)
  const res = await page.request.get('/')
  const h = res.headers()
  expect(h['x-content-type-options']).toBe('nosniff')
  expect(h['referrer-policy']).toBe('same-origin')
  expect(h['permissions-policy']).toContain('camera=()')
  const csp = h['content-security-policy'] ?? ''
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("connect-src 'self' https://api.anthropic.com")
  expect(csp).toContain("object-src 'none'")
  expect(csp).toContain("base-uri 'self'")
  expect(csp).toContain("frame-ancestors 'none'")
  expect(csp).toMatch(/script-src 'self' 'nonce-/)
  expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/)
})

test('pages run without any content-policy violation', async ({ page }) => {
  /** @type {string[]} */
  const problems = []
  page.on('console', (m) => {
    if (/content security policy|refused to/i.test(m.text())) problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(e.message))
  await login(page)
  const slug = await firstWordSlug(page)
  for (const route of ['/', `/word/${slug}`, '/review', '/wordbook', '/studio', '/settings']) {
    await page.goto(route)
    await page.getByRole('heading', { level: 1 }).waitFor()
  }
  await page.goto('/studio/teaser/bat-and-ball')
  await page.getByRole('heading', { level: 1 }).waitFor()
  expect(problems).toEqual([])
})
