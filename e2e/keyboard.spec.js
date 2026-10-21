import { test, expect } from '@playwright/test'
import { firstWordSlug, login } from './helpers.js'

/**
 * PRD: "Given the learner uses only a keyboard, all core actions can be completed with visible
 * focus and no keyboard trap." Controls are reached with Tab and operated with Enter, Space or
 * arrow keys.
 */
test.use({ reducedMotion: 'reduce' })

/**
 * Press Tab until the focused element matches `selector`.
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
async function tabTo(page, selector, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    if (await page.evaluate((s) => Boolean(document.activeElement?.matches(s)), selector)) return
  }
  throw new Error(`Never reached ${selector} by keyboard in ${max} Tab presses`)
}

test.beforeEach(async ({ page }) => {
  await login(page)
})

test('the skip link is the first stop and jumps to the content', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main$/)
})

test('focus is always visible, and there is no keyboard trap', async ({ page }) => {
  await page.goto('/')
  const seen = new Set()
  let invisible = 0
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const s = getComputedStyle(el)
      const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
      return {
        id: `${el.tagName}:${el.getAttribute('href') ?? el.textContent?.trim().slice(0, 24)}`,
        outline,
        shadow: s.boxShadow !== 'none'
      }
    })
    if (!info) continue
    seen.add(info.id)
    if (!info.outline && !info.shadow) invisible++
  }
  expect(seen.size, 'focus keeps moving through many different controls').toBeGreaterThan(12)
  expect(invisible, 'every focused control shows a focus indicator').toBe(0)
})

test('a word card opens, flips, and a note is saved, all by keyboard', async ({ page }) => {
  await page.goto('/')
  await tabTo(page, 'ol.words a.stretch')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/word\//)

  await tabTo(page, 'button.btn[aria-pressed]')
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: 'Show the word' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )

  await tabTo(page, '#note')
  await page.keyboard.type('Remembered with the keyboard.')
  await tabTo(page, 'button[type="submit"].btn')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Saved ✓')).toBeVisible()
})

test('a review question can be answered and rated by keyboard', async ({ page }) => {
  await page.goto('/review')
  await expect(page.getByText(/Question 1 of/)).toBeVisible()

  // Answer, whichever kind of question comes first.
  if (await page.getByRole('button', { name: 'Show the meaning' }).count()) {
    await tabTo(page, 'button.btn')
    await page.keyboard.press('Enter')
  } else if (await page.locator('#answer').count()) {
    await tabTo(page, '#answer')
    await page.keyboard.type('x')
    await page.keyboard.press('Enter')
  } else {
    await tabTo(page, 'button.opt')
    await page.keyboard.press('Enter')
  }

  // Rate with the first rating button that can be reached.
  await tabTo(page, '.ratings button')
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Question 2 of|Session complete/)).toBeVisible()
})

test('a brain teaser can be answered by keyboard', async ({ page }) => {
  await page.goto('/studio/teaser/bat-and-ball')
  await tabTo(page, 'button.opt')
  await page.keyboard.press('Enter')
  await expect(page.locator('.verdict')).toBeVisible()
  await expect(page.locator('button.opt').first()).toBeDisabled()
})

test('settings radio groups work with the arrow keys', async ({ page }) => {
  await page.goto('/settings')
  await tabTo(page, 'input[name="theme"]')
  const before = await page.evaluate(() => document.documentElement.dataset.theme ?? 'system')
  await page.keyboard.press('ArrowDown')
  const after = await page.evaluate(() => document.documentElement.dataset.theme ?? 'system')
  expect(after).not.toBe(before)
  // Put it back so later tests are unaffected.
  await page.evaluate(() => {
    localStorage.removeItem('theme')
    delete document.documentElement.dataset.theme
  })
})

test('wordbook search is operable by keyboard', async ({ page }) => {
  await page.goto('/wordbook')
  await tabTo(page, 'input[type="search"]')
  await page.keyboard.type('a')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/q=a/)
})

test('every main page is reachable from the navigation by keyboard', async ({ page }) => {
  await page.goto('/')
  for (const [name, url] of [
    ['Review', /\/review$/],
    ['Wordbook', /\/wordbook$/],
    ['Studio', /\/studio$/],
    ['Progress', /\/progress$/],
    ['Settings', /\/settings$/]
  ]) {
    await page.goto('/')
    await tabTo(page, `nav a[href$="${String(name).toLowerCase()}"]`, 20)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(url)
  }
  void (await firstWordSlug(page))
})
