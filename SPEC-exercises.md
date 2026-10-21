# Spec: Exercise page and "Word Nuance" (AI-driven)

Extends [`SPEC.md`](SPEC.md) (the app) without replacing it. Everything in `SPEC.md` still applies
unless this document says otherwise. **One deliberate amendment:** `SPEC.md` assumed "no LLM at
runtime". This feature adds an _optional_ AI exercise. That stays within the PRD (section 14: AI is
optional, budget-limited and replaceable; section 14: avoid lock-in to one AI provider): the rest of
the app works unchanged with no key and no AI.

## Capability map (three small modules, built in this order)

| Module id      | Responsibility                                                                | Depends on                  |
| -------------- | ----------------------------------------------------------------------------- | --------------------------- |
| `ai-client`    | Holds the user's Claude API key in the browser, calls Claude from the browser | none                        |
| `exercise-hub` | The Exercise page: a menu of exercise types, ready for more than one          | none                        |
| `word-nuance`  | Pick a word, generate a passage, choose the best word, show answer and reason | `ai-client`, `exercise-hub` |

Build order: `ai-client`, then `exercise-hub`, then `word-nuance`. The interface between `ai-client`
and `word-nuance` is one function (`generateNuanceItem`), described below.

## Assumptions (correct me now or I proceed with these)

1. **Calls go from the browser straight to Anthropic, never through our server.** This is the only
   way to honor "the API key is stored only in the browser": a server hop would see the key.
   Anthropic supports this with the `anthropic-dangerous-direct-browser-access: true` header. The
   name is a warning, not a flaw: it exists because a key in a browser is exposed to anything that
   can run script in that page. We reduce that risk (see Security) but cannot remove it.
2. **The key lives in `localStorage` only**, entered by the learner, never in the database, never in
   a backup, never in a URL, a cookie, a log or an error report, and never sent to our server.
3. **Model.** The learner picks from a short list in the Exercise settings, default **Claude Sonnet
   5.5** (`claude-sonnet-5-5`), with **Haiku 5.5** (`claude-haiku-5-5`, cheaper and faster),
   **Opus 5.5** (`claude-opus-5-5`) and **Fable 5.1** (`claude-fable-5-1`) available. The model id is
   a setting, not hard-coded in logic, so it is easy to change.
4. **Word source.** A word comes either from **words you have already met** (the featured words, so
   nothing is spoiled) or **typed in**. Not from the unseen part of the library.
5. **Options.** For a library word, the choices are the word plus **3 to 5 of its stored related
   words** (the synonyms we already wrote, with their distinctions), so the exercise reinforces what
   you studied. For a typed word, Claude proposes the related words.
6. **The best answer varies.** The best fit is sometimes the chosen word and often one of its
   synonyms. If it were always the chosen word, the exercise would teach nothing.
7. **One blank per item**, in either a sentence or a short paragraph (learner's choice). Multi-blank
   passages are a later extension.
8. **Attempts are saved** to our database (word, options, passage, your choice, the correct answer,
   the date) so they appear in history and the backup. **The key and the model's raw output are
   not** saved.
9. **No key, no problem.** Without a key, the Exercise page shows a friendly setup panel and nothing
   else breaks.
10. **English only**, single user, desktop and mobile, same accessibility bar as the rest of the app.

## Objective

Help the learner feel the **difference between near-synonyms** by choosing the best word for a
realistic sentence or paragraph. Claude writes the item and, after the learner answers, explains why
the best word fits and why each alternative does not. Fresh items on demand, based on words the
learner is already studying.

**Success:** a learner with their own Claude key can pick a word, get a well-formed item in a few
seconds, answer it, learn from the explanation, and revisit their history, with the key never
leaving their browser.

## Core features and acceptance criteria

### `ai-client`

- A "Claude connection" panel: paste key, **Save**, **Test**, **Remove**. The field is a password
  input; the key is shown only as its last four characters afterwards.
- Reject obviously wrong input (must start `sk-ant-`, no spaces) before saving.
- **Test** makes one tiny request and reports success or a clear reason for failure.
- Calls Claude's Messages API directly from the browser with **structured outputs**
  (`output_config.format` of type `json_schema`; verified in `docs/CLAUDE-API-NOTES.md`, which
  replaced the earlier "forced tool call" idea because Sonnet 5.5, Opus 5.5 and Fable 5.1 reject a
  forced `tool_choice`), a generous `max_tokens` cap (thinking counts toward it, one retry with a
  higher cap on `max_tokens`), low effort per model, a request timeout, and one retry on
  "overloaded" or rate-limit responses. A `refusal` stop reason is shown as a friendly message.
- Every response is **validated** before use; anything malformed shows a friendly "try again".
- Friendly messages for: missing key, invalid key (401), no permission (403), rate limit (429),
  overloaded (529), network error, timeout, malformed answer.
- **Acceptance:** with a mocked Claude, the key appears in the request header to `api.anthropic.com`
  and in **no** request to our own server; removing the key clears it from storage.

### `exercise-hub`

- A new **Exercise** item in the main navigation and a page listing exercise types. Only Word Nuance
  exists now; the layout expects more.
- Shows the connection status ("Connected" / "Add your Claude key") with a link to the key panel.
- **Acceptance:** reachable by keyboard, passes the axe scan in light and dark themes, works with no
  key.

### `word-nuance`

1. **Choose a word.** Tabs: _From my words_ (search and pick) or _Type a word_.
2. **Options:** passage length (sentence or short paragraph), number of choices (4 to 6), optional
   difficulty (everyday, professional, literary).
3. **Generate.** Shows a loading state with the owl, then the passage with one blank and the choices.
   Claude must: write a natural passage where **exactly one** choice fits best, keep the others
   plausible but clearly worse in this context, avoid giving the answer away, and return the best
   word with a reason for it and a short reason each alternative fails.
4. **Answer.** Select a choice. The result unfolds: correct or not, the best word in the full
   passage, the reason, and why each other word does not fit. Wrong answers are never punished
   (same tone as Mind Studio).
5. **Next.** "Another one" (same word), "New word", or flag "This item seems unclear" (stored with
   the attempt for later review).
6. **History.** Recent attempts with the passage and your choice.

**Acceptance:** one correct answer per item as judged by the validator (the answer is one of the
choices, appears in the explanation, and every alternative has a reason); the answer is not in the
page until the learner answers; the passage always contains exactly one blank; items render as plain
text (never HTML).

## Tech stack

- Same stack as the app (SvelteKit 3, Svelte 5, JavaScript with JSDoc, `@libsql/client`).
- **No new dependency.** The Claude call is a plain `fetch`, kept behind a small provider interface
  (`generateNuanceItem(input) -> item`) so the provider can be swapped later (PRD: no lock-in). The
  official Anthropic SDK is not used, to keep the bundle small and the key handling explicit.
- Exact request shape, headers, model ids and limits **must be checked against Anthropic's current
  documentation at build time** (the source-driven-development rule) before implementation, because
  they change.

## Security (this feature raises the stakes)

A key in `localStorage` can be read by any script that runs on the page. So:

- **Content-Security-Policy** added for the whole app (SvelteKit's built-in `csp` support with
  nonces): `default-src 'self'`, `script-src 'self'` plus nonces, `connect-src 'self'
https://api.anthropic.com`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`. No
  third-party scripts, ever.
- Everything Claude returns is rendered **as text** (no `{@html}`), so a hostile or odd answer cannot
  inject script.
- The key is read only inside the `ai-client` module; no component receives it, no `console.log`
  mentions it, and error handlers strip it.
- Prompts contain **only** the word, its related words and the chosen options. Never your notes,
  tags, history or passcode.
- The panel tells the learner plainly: the key stays in this browser; anyone using this browser
  profile can use it; use a key with a spend limit; remove it on shared computers.

## Data (needs your approval, see Boundaries)

One new table (a new migration, `002_exercises.sql`): `exercise_attempt` with `id, kind
('word-nuance'), word_id (nullable), word_text, passage, options (JSON), answer_index, chosen_index,
reason (text), flagged (0/1), model, created_at`. Added to the backup format as `exerciseAttempts`
(format version stays readable; older backups simply have none).

## Commands

```
Dev server:    npm run dev
Unit tests:    npm test                       # includes ai-client with a mocked fetch
E2E tests:     npm run test:e2e               # Claude is mocked by Playwright; no real calls
Lint/types:    npm run lint && npm run check
Content/links: npm run content:lint
Build:         npm run build
```

Tests never call the real Claude API and never need a key. A manual "live check" (a button in the
panel and a documented script) is for the owner only.

## Project structure (additions)

```
src/routes/exercise/
  +page.svelte, +page.server.js            Hub: exercise types, key status
  word-nuance/+page.svelte                 The exercise UI (client-side generation)
  word-nuance/+page.server.js              Word search, saving attempts, history
src/lib/ai/                                Runs in the browser; never imports server code
  key-store.js                             localStorage get/set/remove, masking
  claude.js                                fetch wrapper: headers, timeout, retry, errors
  nuance-prompt.js                         Builds the prompt and the JSON schema
  nuance-item.js                           Validates and normalizes the model's answer
src/lib/components/ClaudeKeyPanel.svelte   Save / Test / Remove
src/lib/server/exercises.js                Save and list attempts (database only, no AI)
db/migrations/002_exercises.sql            The new table
tests/ai-*.test.js  e2e/exercise.spec.js   Unit tests (mock fetch) and browser tests (mock route)
```

`src/lib/ai/` must stay free of server imports so the key can never travel to the server by accident.

## Code style

Same as the app. One real example of the shape expected (plain JavaScript, JSDoc, small pure
functions, errors as data with friendly messages):

```js
// src/lib/ai/nuance-item.js
/** @typedef {{ passage: string, options: string[], answerIndex: number,
 *   reason: string, whyNot: { word: string, reason: string }[] }} NuanceItem */

/**
 * Check a model answer before the UI trusts it. Pure: no I/O.
 * @param {unknown} raw
 * @returns {{ ok: true, item: NuanceItem } | { ok: false, problem: string }}
 */
export function validateNuanceItem(raw) {
  const o = /** @type {Record<string, any>} */ (raw)
  if (typeof o?.passage !== 'string' || (o.passage.match(/_{3,}/g) ?? []).length !== 1)
    return { ok: false, problem: 'The passage must contain exactly one blank.' }
  // ...options distinct, answerIndex in range, reason present, one whyNot per wrong option
  return { ok: true, item: /** @type {NuanceItem} */ (o) }
}
```

## Testing strategy

| Level               | What                                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (mock `fetch`) | Key store (save, mask, remove, bad format); request headers and body; every error path; retry once on 429/529; timeout; the validator with good and bad items; prompt contains only allowed fields                        |
| Integration         | Saving and listing attempts; backup round trip including `exerciseAttempts`; old backups still load                                                                                                                       |
| E2E (mock Claude)   | No key: setup shown; enter key, Test passes (mocked); generate, answer, see reason; **the key never appears in any request to our server**; removing the key empties storage; keyboard-only run; axe clean in both themes |
| Security            | CSP header present and `connect-src` limited; response text containing `<script>` renders as text                                                                                                                         |
| Manual (owner)      | One real call with the owner's own key to confirm the live API still matches                                                                                                                                              |

Target: all new logic in `src/lib/ai/` fully covered by unit tests; no test spends real money.

## Boundaries

- **Always:** keep the key only in `localStorage` and only inside `ai-client`; validate every model
  answer; render model text as text; cap tokens, time and retries; show the cost-aware setup
  warnings; keep the rest of the app working with no key; test with mocks.
- **Ask first:** the new database table and backup field; adding any dependency (for example the
  official SDK); adding any other AI provider; changing the CSP beyond what is listed; sending any
  data to Anthropic other than the word, its related words and the chosen options.
- **Never:** send the key to our server, a log, a backup, a URL or an analytics tool; store the key
  anywhere but `localStorage`; use `{@html}` for model output; include notes or personal history in
  a prompt; call the real API from tests; ship a default or shared API key; quietly fall back to a
  server-side call.

## Success criteria

1. With no key, the Exercise page works and explains how to connect; nothing else in the app changes.
2. A key can be saved, tested and removed; after removal, storage holds no trace of it.
3. In an end-to-end run with Claude mocked, the key is sent only to `api.anthropic.com` and never to
   our server (asserted).
4. A word from "my words" or typed produces a valid item (exactly one blank, one best answer, reason
   plus a reason per alternative); invalid model output shows a friendly retry, never a broken page.
5. The answer is absent from the page until the learner answers.
6. Attempts persist, show in history, and survive backup and restore.
7. CSP is active and the whole app (all existing browser tests) still passes, in both themes, with no
   serious axe findings.
8. Every failure mode listed under `ai-client` has a friendly message and a unit test.

## Decisions (approved by the owner)

All seven open questions were answered by accepting the recommendations:

1. **Related words for library words:** use our stored synonyms; Claude proposes them only for typed words.
2. **The best answer varies:** sometimes the chosen word, often one of its synonyms.
3. **Attempts are saved** in the database and included in backups.
4. **Default model:** Sonnet 5.5, with Haiku 5.5, Opus 5.5 and Fable 5.1 selectable.
5. **Second-opinion check:** an optional setting, off by default.
6. **Words you can pick:** only words you have met, or typed in.
7. **Navigation:** Exercise gets its own item in the main navigation (the mobile tab bar must be
   checked at phone width with seven items).

The implementation plan is in [`tasks/plan-exercises.md`](tasks/plan-exercises.md).
