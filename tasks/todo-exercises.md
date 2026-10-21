# Task List: Exercise page and Word Nuance

See [plan-exercises.md](plan-exercises.md) for architecture, dependencies and risks. Sizes: S = 1-2
files, M = 3-5 files. Every task also meets the plan's Definition of Done.

## Phase 1: Foundations

- [x] **X1 Verify the current Claude API** (S) — deps: none
  - Acceptance: `docs/CLAUDE-API-NOTES.md` records, from Anthropic's current documentation: the
    Messages endpoint, required headers (including the direct-browser-access header and version),
    the forced tool-use request shape, response shape, error codes, the model ids we list, and the
    date checked. Any difference from SPEC-exercises.md is reported and the spec updated.
  - Verify: the note cites its sources; no code written yet.
  - Files: `docs/CLAUDE-API-NOTES.md`

- [x] **X2 Content-Security-Policy and security headers** (M) — deps: none
  - Acceptance: SvelteKit `csp` with nonces: `default-src 'self'`, scripts `'self'` plus nonce,
    `connect-src 'self' https://api.anthropic.com`, `object-src 'none'`, `base-uri 'self'`,
    `frame-ancestors 'none'`; plus `X-Content-Type-Options`, `Referrer-Policy`,
    `Permissions-Policy`. Inline theme script and confetti still work.
  - Verify: `npm run test:e2e` (all 22 pass); a test asserts the headers; manual look at Today,
    word page and a Mind Studio answer with confetti, console shows no CSP violations.
  - Files: `vite.config.js`, `src/hooks.server.js`, `src/app.html`, `e2e/security.spec.js`

- [x] **X3 Key store and Claude client** (M) — deps: X1
  - Acceptance: `key-store.js` saves, reads (masked and raw), validates (`sk-ant-`, no spaces) and
    removes the key in `localStorage`, surviving blocked storage. `claude.js` does the `fetch`:
    headers, forced tool call, `max_tokens`, timeout, one retry on 429 and 529, and friendly typed
    errors for missing key, 401, 403, 429, 529, network, timeout and malformed response. The key is
    never logged or included in thrown errors.
  - Verify: `npm test` (new unit tests with mocked `fetch` for every path above); a test proves
    `src/lib/ai/` imports nothing from `src/lib/server/`.
  - Files: `src/lib/ai/key-store.js`, `src/lib/ai/claude.js`, `tests/ai-client.test.js`,
    `tests/ai-isolation.test.js`

- [x] **X4 Nuance prompt and validator** (M) — deps: X1
  - Acceptance: `nuance-prompt.js` builds the system and user prompt and the tool schema from
    `{ word, options, length, difficulty }` and contains only those fields. `nuance-item.js`
    validates: exactly one blank, 4 to 6 distinct options, the answer index in range, a reason, one
    reason per wrong option, no HTML. `generateNuanceItem(input)` ties it to the client and returns a
    validated item or a friendly problem.
  - Verify: `npm test` (good and bad items, prompt field allow-list, a model answer containing
    `<script>` stays plain text).
  - Files: `src/lib/ai/nuance-prompt.js`, `src/lib/ai/nuance-item.js`, `src/lib/ai/generate.js`,
    `tests/ai-nuance.test.js`

### Checkpoint F: Foundations

- [x] Lint, types, all unit tests and all existing browser tests pass; CSP active; build clean
- [ ] Review with user

## Phase 2: Exercise hub

- [x] **X5 Exercise hub, navigation and Claude connection panel** (M) — deps: X3
  - Acceptance: an **Exercise** page listing Word Nuance, with connection status; a nav item (checked
    at phone width with seven items); `ClaudeKeyPanel` with password field, Save, Test (mocked in
    tests), Remove, last-four mask, and the plain warnings (stays in this browser, use a spend limit,
    remove on shared computers). Works with no key.
  - Verify: browser test with a mocked Anthropic route: no key shows setup; save, test, remove;
    storage empty afterwards; **no request to our own server contains the key**; axe clean in both
    themes; keyboard operable; screenshot of the mobile tab bar.
  - Files: `src/routes/exercise/+page.svelte`, `+page.server.js`,
    `src/lib/components/ClaudeKeyPanel.svelte`, `src/routes/+layout.svelte`, `e2e/exercise-hub.spec.js`

### Checkpoint G: Hub

- [x] Key saved, tested and removed with mocks; no-key state fine; mobile nav fine; axe clean
- [ ] Review with user

## Phase 3: Word Nuance

- [x] **X6 Attempts in the database and backup** (M) — deps: none
  - Acceptance: migration `002_exercises.sql` adds `exercise_attempt`; `exercises.js` saves and
    lists attempts; backup export and import include `exerciseAttempts`; older backups still load;
    the integrity and admin pages are unaffected.
  - Verify: `npm test` (save and list; backup round trip with attempts; an old backup without the
    field restores cleanly); `docs/EXPORT-FORMAT.md` updated.
  - Files: `db/migrations/002_exercises.sql`, `src/lib/server/exercises.js`,
    `src/lib/server/export.js`, `tests/exercises.test.js`, `docs/EXPORT-FORMAT.md`

- [x] **X7 Word picker** (S) — deps: none
  - Acceptance: a server loader lists words you have met (search by headword) with their stored
    related words and distinctions; typed words are trimmed and checked (letters, spaces, hyphens,
    sensible length). Library words use 3 to 5 stored related words as options.
  - Verify: `npm test` (only featured words listed; option building; typed-word validation).
  - Files: `src/routes/exercise/word-nuance/+page.server.js`, `src/lib/server/nuance-words.js`,
    `tests/nuance-words.test.js`

- [x] **X8 Word Nuance play screen** (M) — deps: X4, X5, X6, X7
  - Acceptance: tabs for My words and Type a word; options for length, number of choices and
    difficulty; Generate shows the owl loading state, then the passage with one blank and the
    choices; answering reveals correct or not, the best word in the full passage, the reason and why
    each other word fails, with the same gentle tone as Mind Studio; the answer is not in the page
    before answering; the attempt is saved; the best word is sometimes a synonym.
  - Verify: browser test with a mocked Claude (correct and wrong paths, invalid model output shows a
    friendly retry); `npm test` for any new helpers; manual look in both themes and at phone width.
  - Files: `src/routes/exercise/word-nuance/+page.svelte`, `+page.server.js` (save action),
    `src/lib/components/NuanceItem.svelte`, `e2e/word-nuance.spec.js`

- [x] **X9 History, model setting, flag and second opinion** (M) — deps: X8
  - Acceptance: history of recent attempts with the passage and your choice; "This item seems
    unclear" flag stored with the attempt; model picker (Sonnet 5.5 default, Haiku 5.5, Opus 5.5,
    Fable 5.1) saved in `localStorage`; optional second-opinion check, off by default, that asks
    Claude to confirm exactly one option fits and discards items it rejects.
  - Verify: `npm test` and browser tests with mocks (history, flag, model in the request body,
    second opinion on and off).
  - Files: `src/routes/exercise/word-nuance/+page.svelte`, `src/lib/ai/verify.js`,
    `src/lib/ai/settings.js`, `tests/ai-verify.test.js`, `e2e/word-nuance.spec.js`

### Checkpoint H: Word Nuance

- [x] End to end with mocked Claude: choose word, generate, answer, reasoning, history; backup
      round trip includes attempts
- [ ] Review with user

## Phase 4: Ship

- [x] **X10 Hardening, keyboard, docs and deploy** (M) — deps: all
  - Acceptance: security e2e (key never reaches our server across the whole flow; response text with
    markup renders as text; CSP violations absent), keyboard-only run of the whole exercise, axe in
    both themes on the new pages; `SPEC.md`, `README.md`, `docs/ACCEPTANCE.md` and `docs/DEPLOY.md`
    updated (including the "no LLM at runtime" amendment and how to get and limit a key); pushed and
    deployed.
  - Verify: full suite (`lint`, `check`, `test`, `content:lint`, `build`, `test:e2e`); live
    healthz after deploy.
  - Files: `e2e/exercise-security.spec.js`, `SPEC.md`, `README.md`, `docs/ACCEPTANCE.md`,
    `docs/DEPLOY.md`

### Checkpoint I: Done

- [x] All SPEC-exercises success criteria met; deployed
- [ ] Owner confirms one real exercise with their own Claude key
