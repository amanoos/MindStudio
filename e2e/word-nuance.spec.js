import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

const KEY = 'sk-ant-api03-e2e-secret-key-9876'
const REASON = 'Scathing carries the biting, merciless tone the sentence sets up.'

test.use({ reducedMotion: 'reduce' })
test.describe.configure({ mode: 'serial' })

/**
 * Claude, mocked. Replies with an exercise for whatever target word the prompt names. `mode`
 * switches between a good item and a broken one.
 * @param {import('@playwright/test').Page} page
 */
async function mockClaude(page) {
  const state = {
    mode: 'good',
    calls: 0,
    target: '',
    verdict: 'agree',
    bodies: /** @type {any[]} */ ([])
  }
  await page.route('https://api.anthropic.com/**', async (route) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    state.calls++
    const body = route.request().postDataJSON()
    state.bodies.push(body)
    if (String(body.system).includes('copy editor')) {
      const lines = String(body.messages[0].content).split(String.fromCharCode(10))
      const at = lines.findIndex((l) => l.endsWith(`: ${state.target}`))
      const best = state.verdict === 'agree' ? Number(lines[at].split(':')[0]) : -1
      const answer = { best_index: best, equally_good: [best] }
      return route.fulfill({
        status: 200,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: JSON.stringify(answer) }]
        })
      })
    }
    const target = /Target word: (.+)/.exec(body.messages[0].content)?.[1] ?? 'word'
    state.target = target
    const item =
      state.mode === 'good'
        ? {
            passage:
              'The critic gave the film a _____ review, praising nothing and sparing no one.',
            options: [target, 'gentle', 'mild', 'kind'],
            correct_index: 0,
            reason: REASON,
            option_notes: ['Fits: biting.', 'Too soft.', 'Too weak.', 'Wrong tone.']
          }
        : {
            passage: 'No blank here at all.',
            options: [target],
            correct_index: 0,
            reason: 'x',
            option_notes: ['x']
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
  return state
}

/** @param {import('@playwright/test').Page} page */
async function withKey(page) {
  await page.goto('/exercise')
  await page.evaluate((k) => localStorage.setItem('mind-studio.claude-key', k), KEY)
}

test('play a word from my library: blank, answer hidden, right answer, saved to history', async ({
  page
}) => {
  const claude = await mockClaude(page)
  /** @type {string[]} */
  const toOurServer = []
  page.on('request', (req) => {
    const host = new URL(req.url()).hostname
    if (host === 'localhost' || host === '127.0.0.1')
      toOurServer.push(`${req.url()} ${JSON.stringify(req.headers())} ${req.postData() ?? ''}`)
  })
  await login(page)
  await page.goto('/') // meeting today's words makes them available
  await withKey(page)
  await page.goto('/exercise/word-nuance')

  const firstWord = page.getByRole('list', { name: 'Your words' }).getByRole('button').first()
  const headword = (await firstWord.innerText()).trim()
  await firstWord.click()
  await page.getByRole('button', { name: 'Write one for me' }).click()

  // The passage has a blank and the reasoning is not on the page yet.
  await expect(page.getByRole('img', { name: 'blank' })).toBeVisible()
  const group = page.getByRole('group', { name: 'Which word fits best?' })
  await expect(group.getByRole('button')).toHaveCount(4)
  expect(await page.locator('body').innerText()).not.toContain(REASON)
  expect(await page.locator('body').innerText()).not.toContain('Fits: biting.')

  // The request to Claude carried only what it should.
  const sent = claude.bodies[0]
  expect(sent.model).toBe('claude-sonnet-5-5')
  expect(sent.messages[0].content).toContain(`Target word: ${headword}`)
  expect(sent.output_config.format.type).toBe('json_schema')

  await group.getByRole('button', { name: headword }).click()
  await expect(page.getByText('Yes, that is the best fit!')).toBeVisible()
  await expect(page.getByText(REASON)).toBeVisible()
  await expect(page.getByText('Too soft.')).toBeVisible()
  await expect(group.getByRole('button').first()).toBeDisabled()

  // The attempt is saved, and flagging it works.
  await page.getByRole('button', { name: 'This item seems unclear' }).click()
  await expect(page.getByText('Marked as unclear, thank you')).toBeVisible()

  await page.getByRole('button', { name: 'Choose a different word' }).click()
  await expect(page.getByRole('heading', { name: 'Recent tries' })).toBeVisible()
  await expect(page.getByText('1 right out of 1 so far.')).toBeVisible()
  await expect(page.getByText('Marked unclear')).toBeVisible()
  await page.locator('summary', { hasText: headword }).click()
  await expect(page.getByText(REASON)).toBeVisible()

  expect(toOurServer.some((r) => r.includes(KEY))).toBe(false)
})

test('a wrong answer is gentle and still teaches', async ({ page }) => {
  await mockClaude(page)
  await login(page)
  await page.goto('/')
  await withKey(page)
  await page.goto('/exercise/word-nuance')
  await page.getByRole('list', { name: 'Your words' }).getByRole('button').nth(1).click()
  await page.getByLabel('Number of choices').selectOption('4')
  await page.getByRole('radio', { name: 'Tricky' }).check()
  await page.getByRole('button', { name: 'Write one for me' }).click()
  await page
    .getByRole('group', { name: 'Which word fits best?' })
    .getByRole('button', { name: /gentle|mild|kind/ })
    .first()
    .click()
  await expect(page.getByText('Not quite, and that is how we learn.')).toBeVisible()
  await expect(page.getByText(REASON)).toBeVisible()
  await expect(page.getByText('(your pick)')).toBeVisible()
  await page.getByRole('button', { name: 'Choose a different word' }).click()
  await expect(page.getByText('1 right out of 2 so far.')).toBeVisible()
})

test('a typed word works, and a broken answer shows a friendly retry', async ({ page }) => {
  const claude = await mockClaude(page)
  await login(page)
  await withKey(page)
  await page.goto('/exercise/word-nuance')
  await page.getByRole('tab', { name: 'Type a word' }).click()

  await page.getByLabel('Any word you like').fill('x<y')
  await page.getByRole('button', { name: 'Write one for me' }).click()
  await expect(page.getByRole('alert')).toContainText('letters only')
  expect(claude.calls).toBe(0)

  claude.mode = 'broken'
  await page.getByLabel('Any word you like').fill('scathing')
  await page.getByRole('button', { name: 'Write one for me' }).click()
  await expect(page.getByRole('alert')).toContainText('Try again')
  expect(claude.calls).toBe(2) // one automatic second attempt

  claude.mode = 'good'
  await page.getByRole('button', { name: 'Write one for me' }).click()
  await expect(page.getByRole('img', { name: 'blank' })).toBeVisible()
  expect(claude.bodies.at(-1).messages[0].content).toContain('No synonyms were supplied')
  await page.getByRole('button', { name: 'scathing' }).click()
  await expect(page.getByText('Yes, that is the best fit!')).toBeVisible()
})

test('without a key the exercise explains what to do', async ({ page }) => {
  await login(page)
  await page.goto('/exercise')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/exercise/word-nuance')
  await expect(page.getByText('Word Nuance needs your Claude key.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Write one for me' })).toBeDisabled()
})

test('a real Claude error is explained in plain words', async ({ page }) => {
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
  await withKey(page)
  await page.goto('/exercise/word-nuance')
  await page.getByRole('tab', { name: 'Type a word' }).click()
  await page.getByLabel('Any word you like').fill('scathing')
  await page.getByRole('button', { name: 'Write one for me' }).click()
  await expect(page.getByRole('alert')).toContainText('did not accept this key')
})

test('the chosen model is the one sent to Claude', async ({ page }) => {
  const claude = await mockClaude(page)
  await login(page)
  await withKey(page)
  await page.reload()
  await page.getByLabel('Model').selectOption('claude-haiku-5-5')
  await page.goto('/exercise/word-nuance')
  await page.getByRole('tab', { name: 'Type a word' }).click()
  await page.getByLabel('Any word you like').fill('scathing')
  await page.getByRole('button', { name: 'Write one for me' }).click()
  await expect(page.getByRole('img', { name: 'blank' })).toBeVisible()
  expect(claude.bodies.at(-1).model).toBe('claude-haiku-5-5')
  await page.goto('/exercise')
  await page.getByLabel('Model').selectOption('claude-sonnet-5-5')
})

test('the optional second opinion adds a request, and a rejected item is replaced', async ({
  page
}) => {
  const claude = await mockClaude(page)
  await login(page)
  await withKey(page)
  await page.goto('/exercise/word-nuance')
  await page.getByRole('tab', { name: 'Type a word' }).click()
  await page.getByLabel('Any word you like').fill('scathing')

  // Off by default: one request.
  const box = page.getByLabel('Double-check each one with a second request')
  await expect(box).not.toBeChecked()
  await page.getByRole('button', { name: 'Write one for me' }).click()
  await expect(page.getByRole('img', { name: 'blank' })).toBeVisible()
  expect(claude.calls).toBe(1)

  await page.getByRole('button', { name: 'scathing' }).click()
  await expect(page.getByText('Yes, that is the best fit!')).toBeVisible()

  // On: two requests, and the choice is remembered after a reload.
  await page.getByRole('button', { name: 'Choose a different word' }).click()
  await page.getByRole('tab', { name: 'Type a word' }).click()
  await page.getByLabel('Any word you like').fill('scathing')
  await box.check()
  await page.reload()
  await expect(box).toBeChecked()
  await page.getByRole('tab', { name: 'Type a word' }).click()
  await page.getByLabel('Any word you like').fill('scathing')
  const before = claude.calls
  await page.getByRole('button', { name: 'Write one for me' }).click()
  await expect(page.getByRole('img', { name: 'blank' })).toBeVisible()
  expect(claude.calls - before).toBe(2)

  await page.getByRole('button', { name: 'scathing' }).click()
  await expect(page.getByText('Yes, that is the best fit!')).toBeVisible()

  // A second reader who disagrees twice leaves a friendly message.
  await page.getByRole('button', { name: 'Choose a different word' }).click()
  claude.verdict = 'disagree'
  await page.getByRole('tab', { name: 'Type a word' }).click()
  await page.getByLabel('Any word you like').fill('scathing')
  const again = claude.calls
  await page.getByRole('button', { name: 'Write one for me' }).click()
  await expect(page.getByRole('alert')).toContainText('second check')
  expect(claude.calls - again).toBe(4)

  await box.uncheck()
})
