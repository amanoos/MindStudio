import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { firstWordSlug, login } from './helpers.js'

/**
 * Every page, in light and dark, scanned with axe against WCAG 2.1 A and AA. Animations are
 * switched to their reduced form so a half-finished fade cannot be mistaken for low contrast.
 */
const routes = [
  '/',
  '/review',
  '/wordbook',
  '/studio',
  '/studio/teaser',
  '/studio/teaser/bat-and-ball',
  '/studio/critical/ice-cream-and-drowning',
  '/studio/capsule/rosetta-stone',
  '/studio/history',
  '/exercise',
  '/exercise/word-nuance',
  '/progress',
  '/settings',
  '/admin'
]

/** @param {import('@playwright/test').Page} page */
async function scan(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}

/** @param {{ id: string, impact?: string | null, help: string, nodes: { target: unknown }[] }[]} v */
const describe = (v) =>
  v.map(
    (x) =>
      `${x.id} (${x.impact}): ${x.help} [${x.nodes
        .slice(0, 3)
        .map((n) => String(n.target))
        .join(' | ')}]`
  )

for (const scheme of /** @type {const} */ (['light', 'dark'])) {
  test.describe(`accessibility, ${scheme} theme`, () => {
    test.use({ colorScheme: scheme, reducedMotion: 'reduce' })

    test('login page', async ({ page }) => {
      await page.goto('/login')
      expect(describe(await scan(page))).toEqual([])
    })

    test('every signed-in page has no serious or critical violations', async ({ page }) => {
      await login(page)
      const slug = await firstWordSlug(page)
      const failures = []
      for (const route of [...routes, `/word/${slug}`]) {
        await page.goto(route)
        await page.getByRole('heading', { level: 1 }).first().waitFor()
        const problems = describe(await scan(page))
        if (problems.length) failures.push(`${route}\n  ${problems.join('\n  ')}`)
      }
      expect(failures, failures.join('\n')).toEqual([])
    })
  })
}

test.describe('page structure', () => {
  test.use({ reducedMotion: 'reduce' })

  test('each page has a title, one h1, landmarks and a skip link', async ({ page }) => {
    await login(page)
    for (const route of ['/', '/wordbook', '/studio', '/progress', '/settings']) {
      await page.goto(route)
      await expect(page).toHaveTitle(/Mind Studio/)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page.getByRole('main')).toHaveCount(1)
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCount(1)
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    }
  })
})
