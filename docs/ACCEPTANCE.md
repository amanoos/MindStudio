# Acceptance evidence

Where each requirement is proven. Re-run everything with:

```
npm run lint && npm run check && npm test && npm run content:lint && npm run build
npm run test:e2e          # add E2E_CHANNEL=chrome (or msedge) to use an installed browser
npm run check:bundle
```

## PRD section 16: acceptance criteria

| #   | Criterion                                                                             | Proven by                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A word featured before is rejected before publication                                 | `tests/daily.test.js` (never repeats a featured word, reports low reserve); the database unique constraints (`tests/db.test.js`); the integrity audit in the content admin (`tests/admin.test.js`)                 |
| 2   | Two spellings that normalize to the same headword can be featured only once           | `tests/normalize.test.js`; duplicate detection in `tests/content-lint.test.js`; unique `normalized_headword` (`tests/db.test.js`)                                                                                  |
| 3   | Opening the dashboard repeatedly keeps the same five words for the local date         | `tests/daily.test.js` (repeat visits, ten concurrent requests); `e2e/acceptance.spec.js` (the same five words stay assigned)                                                                                       |
| 4   | If an upstream API fails, saved content and reviews still work                        | The app calls no outside service at runtime: `e2e/acceptance.spec.js` (the app makes no external requests). Content is stored locally and read from the database.                                                  |
| 5   | An uncertain or unsupported etymology is labeled uncertain, or publication is blocked | Blocked: `tests/content-lint.test.js` (unsourced claims fail the linter). Labeled: `e2e/acceptance.spec.js` (an uncertain word history is labeled). Three shipped words are labeled Uncertain.                      |
| 6   | Required attribution and link appear wherever the data is shown                       | `e2e/acceptance.spec.js` (sources and their attribution are shown): every source link is https, opens safely, and shows its license                                                                                |
| 7   | Rating a word Again brings its review forward                                         | `tests/srs.test.js`; `tests/learning.test.js`; `e2e/acceptance.spec.js` (rating a word Again brings its review forward to minutes)                                                                                  |
| 8   | Export includes headwords, content metadata, sources, notes and learning states       | `tests/phase3.test.js` (wordbook export, backup round trip); `e2e/acceptance.spec.js` (export includes headwords, metadata, sources, notes and learning states); format in `docs/EXPORT-FORMAT.md`                  |
| 9   | Keyboard-only use: all core actions, visible focus, no keyboard trap                  | `e2e/keyboard.spec.js` (skip link, focus indicators across 60 Tab stops, no trap, word card, note, review, teaser, settings, search, navigation)                                                                    |
| 10  | Changing timezone keeps history, and future sets use the new local date               | `tests/phase3.test.js` and `tests/daily.test.js` (timezone cases); `e2e/acceptance.spec.js` (changing timezone keeps history)                                                                                       |

## PRD section 20: definition of done

| Requirement                                              | Evidence                                                                                                        |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Opens on desktop or mobile                               | Responsive layout with a bottom tab bar under 900px; checked at phone width during development                |
| Five new words without repeats                           | Criteria 1 to 3 above                                                                                           |
| Reliable, attributed word histories                      | 100 words, each with source links; `npm run content:lint`; `npm run content:links` (all Wiktionary links load) |
| Practice and review of older words                       | `tests/learning.test.js`, `tests/srs.test.js`, `tests/questions.test.js`                                        |
| Searchable personal wordbook                             | `tests/phase3.test.js` (wordbook search)                                                                        |
| At least three enrichment activity types                 | Teasers, capsules, critical-thinking prompts: `tests/activities.test.js`                                        |
| Export and restore of personal data                      | `tests/phase3.test.js` (round trip, atomic restore); verified through the UI in a browser                       |
| Works when an external dictionary API is unavailable     | Criterion 4                                                                                                     |
| Does not publish unsupported historical claims as fact   | Content linter plus Sourced and Uncertain labels                                                                |

## Project specification: success criteria

| #   | Criterion                                                               | Status and evidence                                                                                                                                                         |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Deploys to Render free plus Turso with no manual database steps         | Deployed and verified live by the owner. Migrations and seeding run at start. `docs/DEPLOY.md`.                                                                              |
| 2   | `docker compose up` works; data survives down and up                    | Verified locally (login, words, restart persistence, cross-site request rejected)                                                                                           |
| 3   | Five distinct words per date; zero duplicate headwords                  | Criteria 1 to 3                                                                                                                                                             |
| 4   | All PRD section 16 criteria pass in automated tests                     | The table above                                                                                                                                                             |
| 5   | Ratings schedule per the ladder; Again moves the due date earlier       | `tests/srs.test.js`                                                                                                                                                         |
| 6   | Three Mind Studio activity types end to end, with explanations, sources | `tests/activities.test.js`; all 40 capsule and prompt source links load                                                                                                     |
| 7   | Export then restore on a fresh database reproduces everything           | `tests/phase3.test.js` (round-trips)                                                                                                                                        |
| 8   | Axe finds no serious or critical issues; core flows work by keyboard    | `e2e/a11y.spec.js` (14 pages, light and dark); `e2e/keyboard.spec.js`                                                                                                       |
| 9   | Animation catalog implemented; usable with reduced motion               | Implemented. Reduced motion is honored from the device or a setting, and the accessibility and keyboard suites run with it on.                                              |
| 10  | Initial JavaScript at most 120 KB gzipped; Lighthouse performance 90+   | JavaScript: about 51 KB gzipped (`npm run check:bundle`). **Lighthouse performance was not measured here**; run it in Chrome DevTools on the live site (mobile profile). |

## Exercise page and Word Nuance (SPEC-exercises.md)

| Requirement                                                              | Proven by                                                                                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Key is stored only in the browser, and removing it clears storage        | `tests/ai-client.test.js` (key store); `e2e/exercise-hub.spec.js` (save, test, remove, reload)                                               |
| The key never reaches our server, database or backups                    | `e2e/exercise-hub.spec.js`, `e2e/word-nuance.spec.js`, `e2e/exercise-security.spec.js` (no request to our server contains it); `tests/ai-isolation.test.js` (AI code imports nothing server-side) |
| Claude is called with the documented request shape and friendly errors   | `tests/ai-client.test.js` (headers, structured output, 401/402/403/404/429/529/500/504, timeout, network, refusal, cut-off, malformed)      |
| Every generated item is validated before use                             | `tests/ai-nuance.test.js` (one blank, 4 to 6 distinct choices, valid answer, notes, no give-away); a broken reply shows a retry (`e2e/word-nuance.spec.js`) |
| Pick a met word or type one; typed words are checked                     | `tests/nuance-words.test.js`; `e2e/word-nuance.spec.js`                                                                                      |
| The answer and reasoning are hidden until the learner answers            | `e2e/word-nuance.spec.js` (reason and notes absent from the page before answering)                                                        |
| Attempts are saved, listed, flaggable and backed up; old backups restore | `tests/exercises.test.js`; `e2e/word-nuance.spec.js` (history, flag)                                                                         |
| Model setting and optional second opinion                                | `tests/ai-verify.test.js`; `e2e/word-nuance.spec.js` (model in request, one vs two requests, rejected items replaced)                       |
| Strict content policy and security headers                               | `e2e/security.spec.js` (headers, no violations on core pages); `e2e/exercise-security.spec.js` (hostile model text stays text, no violations) |
| Keyboard-only and accessible, both themes; seven-item mobile nav fits     | `e2e/exercise-security.spec.js` (keyboard-only play, axe light and dark); `e2e/a11y.spec.js`; `e2e/exercise-hub.spec.js` (375px nav)         |
| A real Claude answer works end to end                                    | **Owner step, not automated:** one real exercise with your own key (no test spends money).                                                   |

## Known limits

- Word and activity content was drafted by an AI assistant from published references. Source links
  and Uncertain labels are provided, but a person has not independently fact-checked every entry.
  Links to etymonline and Merriam-Webster cannot be checked automatically because those sites block
  scripts; Wiktionary and Wikipedia links are checked.
- Render's free service sleeps when idle, so the first visit after a while is slow. Free-tier limits
  of Render and Turso change; verify them (see `docs/DEPLOY.md`).
- The Lighthouse performance score has not been measured (see criterion 10).
- The Exercise page is checked only against mocked Claude replies. Whether `output_config` structured output combines with each model's default thinking was not confirmable from the documentation, so the first real try-out is the final check (a 400 error is shown plainly in the connection panel).
- Criterion 4 above (no external requests) is about word display. The Exercise page deliberately calls `api.anthropic.com` from your browser, and only after you press a button.
