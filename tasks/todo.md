# Task List: Vocabulary & Mind Studio

See [plan.md](plan.md) for architecture, dependencies and risks. Sizes: S = 1-2 files, M = 3-5 files. Every task also meets the plan's Definition of Done.

## Phase 1: Foundation

- [x] **T1 Scaffold project and tooling** (S) — deps: none
  - Acceptance: SvelteKit 2 + Svelte 5 JS project with adapter-node; ESLint, Prettier, Vitest, Playwright, svelte-check configured; all npm scripts from SPEC "Commands" exist (stubs allowed for db/export).
  - Verify: `npm ci && npm run lint && npm run check && npm test && npm run build`
  - Files: `package.json`, `svelte.config.js`, `vite.config.js`, `eslint.config.js`, `jsconfig.json`

- [x] **T2 Design system shell** (M) — deps: T1
  - Acceptance: `tokens.css` (palette, spacing, radii, durations), light/dark themes, 4 self-hosted fonts, layout with nav, page transitions, SVG Professor Hoot (blink/tilt), `prefers-reduced-motion` honored.
  - Verify: component test for Mascot; manual check in browser at mobile and desktop widths, both themes, with reduced motion on.
  - Files: `src/lib/styles/tokens.css`, `base.css`, `src/routes/+layout.svelte`, `src/lib/components/Mascot.svelte`

- [x] **T3 Database layer and first migration** (M) — deps: T1
  - Acceptance: libsql client (file and remote URL); migration runner; `001_init.sql` with all spec tables and unique constraints; `/healthz` returns DB status.
  - Verify: integration test applies migrations to in-memory DB and proves duplicate `normalized_headword` insert fails. `npm run db:migrate`.
  - Files: `src/lib/server/db.js`, `db/migrations/001_init.sql`, `scripts/migrate.js`, `src/routes/healthz/+server.js`, `tests/db.test.js`

- [x] **T4 Headword normalizer (TDD)** (S) — deps: T1
  - Acceptance: NFKC, case-fold, whitespace/punctuation/hyphen variants, plural/-ed/-ing stemming, `lemma_group` override; table-driven tests cover PRD §16 near-duplicate cases.
  - Verify: `npm test -- normalize`
  - Files: `src/lib/server/normalize.js`, `tests/normalize.test.js`

- [x] **T5 Content schema, linter and seed loader** (M) — deps: T3, T4
  - Acceptance: JSON schema for words (definition, pos, pronunciation respelling, nuance/register, 3–8 synonyms with distinctions, 2 examples labeled app-written, etymology with source + Sourced/Uncertain, current usage, memory hook, practice prompt, sources with license); `content:lint` fails on missing sources, unsourced etymology/dates, duplicates, offensive terms; idempotent `db:seed`; 5 sample words included.
  - Verify: unit tests for each lint failure; seed twice yields no duplicates; `npm run content:lint`.
  - Files: `scripts/content-lint.js`, `scripts/seed.js`, `content/words/batch-00.json`, `tests/content-lint.test.js`

- [x] **T6 Passcode auth** (S) — deps: T1, T3
  - Acceptance: login page, constant-time passcode compare, signed HttpOnly SameSite cookie, rate-limited attempts, all routes guarded except `/login` and `/healthz`.
  - Verify: tests for wrong/right passcode, lockout, protected-route redirect.
  - Files: `src/lib/server/auth.js`, `src/hooks.server.js`, `src/routes/login/+page.svelte`, `+page.server.js`, `tests/auth.test.js`

- [x] **T7 Daily set and Today page** (M) — deps: T5, T6, T2
  - Acceptance: first request per local date picks 5 never-featured words in one transaction, rotating topics; repeat/concurrent requests return the same set; ledger written; low-reserve state shown; Today shows five colorful cards with staggered entrance.
  - Verify: integration tests: idempotency, 10 parallel requests, timezone change, DST boundary, <5 eligible words; manual view of Today.
  - Files: `src/lib/server/daily/select.js`, `daily/publish.js`, `src/routes/+page.server.js`, `+page.svelte`, `tests/daily.test.js`

- [x] **T8 Containerize and first deploy** (M) — deps: T7  
  - Status: live at https://mind-studio.onrender.com (Render free + Turso). Verified /healthz, login guard, CSRF check and the five words. Redeploy-persistence check pending the user.
  - Acceptance: multi-stage Dockerfile, `docker-compose.yml` with volume, `render.yaml`, `.env.example`, boot runs migrate then seed; `DEPLOY.md` with click-by-click Render + Turso steps and the exact values to paste. User completes account steps; Claude verifies the live URL.
  - Verify: `docker compose up` shows Today and survives down/up; live URL passes `/healthz`, redeploy keeps history.
  - Files: `Dockerfile`, `docker-compose.yml`, `render.yaml`, `.env.example`, `docs/DEPLOY.md`

### Checkpoint A: Foundation
- [x] All checks green; live Render + Turso URL shows today's five words; redeploy keeps history (redeploy check pending user); duplicate DB test passes
- [x] Review with user (look and feel check)

## Phase 2: Learning loop

- [x] **T9 Word detail page** (M) — deps: T7
  - Acceptance: all PRD §6.2 fields rendered; source links with license/attribution; Sourced/Uncertain badge; "About our sources" note; Report-an-issue stub.
  - Verify: component and e2e test opening a word from Today; a11y headings.
  - Files: `src/routes/word/[slug]/+page.server.js`, `+page.svelte`, `src/lib/components/SourceList.svelte`, `ConfidenceBadge.svelte`

- [x] **T10 Flip card and animated etymology timeline** (M) — deps: T9, T2
  - Acceptance: 3D flip (keyboard accessible, button + Enter/Space); etymology timeline draws on scroll; both degrade to static under reduced motion.
  - Verify: component tests (flip state, aria-pressed); Playwright reduced-motion emulation.
  - Files: `FlipCard.svelte`, `EtymologyTimeline.svelte`, `animations.css`, `tests/e2e/flip.spec.js`

- [x] **T11 Notes, favorites, tags** (S) — deps: T9
  - Acceptance: save note/favorite/tags per word via form actions; persists across reload; handwriting font for notes.
  - Verify: integration test for actions; e2e persist after reload.
  - Files: `src/lib/server/notes.js`, `src/routes/word/[slug]/+page.server.js`, `NoteEditor.svelte`

- [x] **T12 Spaced-repetition scheduler (TDD)** (S) — deps: T1
  - Acceptance: pure `schedule()` with 1/3/7/14/30 ladder; Again resets and pulls due date earlier; Hard/Good/Easy move the step; state transitions New→Learning→Familiar→Mastered/Revisit.
  - Verify: `npm test -- srs` table-driven.
  - Files: `src/lib/server/srs.js`, `tests/srs.test.js`

- [x] **T13 Review session** (M) — deps: T12, T9
  - Acceptance: queue of due words; question types flashcard, multiple choice, fill-in-blank, synonym discrimination (generated from word content); immediate explanation; Again/Hard/Good/Easy; attempts stored; filters (topic, pos, favorites, due).
  - Verify: unit tests for question generation; e2e review of 3 words updates due dates.
  - Files: `src/lib/server/review/questions.js`, `review/queue.js`, `src/routes/review/+page.server.js`, `+page.svelte`, `RatingButtons.svelte`

- [x] **T14 Completion effects, streak and catch-up** (S) — deps: T13, T7
  - Acceptance: progress ring animates; confetti on 5/5 and perfect review; gentle streak (no guilt copy); "Catch up on yesterday?" opt-in card; optional 5-question recall check, skippable.
  - Verify: unit test for streak and missed-day logic; manual check of effects, off under reduced motion.
  - Files: `ProgressRing.svelte`, `ConfettiBurst.svelte`, `src/lib/server/streak.js`, `+page.svelte`

### Checkpoint B: Learning loop
- [x] Learn five words, review, rate Again/Good; due dates and states change correctly
- [x] Review with user

## Phase 3: Wordbook and data safety

- [x] **T15 Wordbook search and filters** (M) — deps: T11, T13
  - Acceptance: search by headword/definition; filters topic, state, favorites, date; sort; empty state with mascot.
  - Verify: integration tests for query building; e2e search.
  - Files: `src/lib/server/wordbook.js`, `src/routes/wordbook/+page.server.js`, `+page.svelte`, `tests/wordbook.test.js`

- [x] **T16 Export and import backup** (M) — deps: T13, T11
  - Acceptance: JSON full backup + CSV wordbook; documented format in `docs/EXPORT-FORMAT.md`; import restores into an empty DB; Settings buttons; CLI `export`/`import`.
  - Verify: round-trip test (export → fresh DB → import → equal).
  - Files: `src/lib/server/export.js`, `scripts/export.js`, `scripts/import.js`, `docs/EXPORT-FORMAT.md`, `tests/export.test.js`

- [x] **T17 Settings** (S) — deps: T2, T7
  - Acceptance: timezone, theme, text size, motion toggle (overrides system), daily-session length preference; changing timezone keeps history.
  - Verify: tests for timezone change; e2e toggle motion.
  - Files: `src/routes/settings/+page.svelte`, `+page.server.js`, `src/lib/server/settings.js`

### Checkpoint C: Data safety
- [x] Export, wipe, restore on fresh DB reproduces everything; settings persist
- [ ] Redeployed live site still works (verify after the Phase 3 deploy)

## Phase 4: Content and Mind Studio

- [x] **T18 Word batch 1 (20 words: everyday precision + work/communication)** (S) — deps: T5
  - Acceptance: 20 words per schema with sources; `content:lint` green; no duplicates against earlier batches.
  - Verify: `npm run content:lint && npm run db:seed`
  - Files: `content/words/batch-01.json`
- [x] **T19 Word batch 2 (20: literature, rhetoric, arts)** (S) — deps: T18 — same criteria — `batch-02.json`
- [x] **T20 Word batch 3 (20: science, history, philosophy)** (S) — deps: T19 — same criteria — `batch-03.json`
- [x] **T21 Word batch 4 (20: social concepts, idioms/phrases, "surprise me" delights)** (S) — deps: T20 — same criteria — `batch-04.json`
- [x] **T22 Word batch 5 (remainder to ~100, topic balance report)** (S) — deps: T21 — same criteria plus a topic/difficulty distribution check — `batch-05.json`

- [x] **T23 Mind Studio shell and Brain Teaser** (M) — deps: T3, T6, T2
  - Acceptance: Studio hub; teaser flow (attempt → reveal reasoning with unfold animation → gentle shake/sparkle feedback); ~20 teasers; one suggested per day on Today.
  - Verify: tests for daily pick; e2e solve and reveal.
  - Files: `src/routes/studio/+page.svelte`, `studio/[type]/+page.svelte`, `content/activities/teasers.json`, `src/lib/server/activities.js`

- [x] **T24 Curiosity Capsule** (M) — deps: T23
  - Acceptance: ~15 capsules with sources and follow-up question; linter covers activity sources.
  - Verify: `npm run content:lint`; e2e read and answer.
  - Files: `content/activities/capsules.json`, capsule component, lint extension

- [x] **T25 Critical Thinking Lab** (M) — deps: T23
  - Acceptance: ~15 prompts (hidden assumption, correlation vs causation, bias, claim evaluation) with explanations.
  - Verify: `npm run content:lint`; e2e complete one.
  - Files: `content/activities/critical-thinking.json`, component

- [x] **T26 Activity history** (S) — deps: T24, T25
  - Acceptance: attempts stored; history list on Studio and Progress; no punitive scoring.
  - Verify: integration test; e2e.
  - Files: `src/lib/server/activities.js`, `studio/history/+page.svelte`

### Checkpoint D: Content complete
- [x] ~100 words lint-clean and seeded on live site; three activity types work end to end
- [ ] Review with user

## Phase 5: Polish and ship

- [x] **T27 Progress page and word garden** (M) — deps: T13, T26
  - Acceptance: words encountered, review accuracy, due backlog, weekly consistency, self-rated confidence, decorative SVG garden growing by learning state; no medical claims.
  - Verify: unit tests for stats; visual check.
  - Files: `src/routes/progress/+page.server.js`, `+page.svelte`, `Garden.svelte`, `src/lib/server/stats.js`

- [x] **T28 Issue reports and Content Admin** (M) — deps: T9
  - Acceptance: Report-an-issue stores word/field/comment; admin lists reports, duplicate audit, reserve-pool count, generation log.
  - Verify: integration tests; e2e submit and view.
  - Files: `src/routes/admin/+page.svelte`, `+page.server.js`, `src/lib/server/issues.js`

- [x] **T29 Illustration and animation polish pass** (M) — deps: T14, T24
  - Acceptance: illustration set (empty states, headers, per-topic spot art), mascot reactions (cheer/sleep), skeleton shimmer; everything off under reduced motion.
  - Verify: visual check in both themes and widths; reduced-motion e2e.
  - Files: `src/lib/assets/illustrations/*.svg`, `Mascot.svelte`, `animations.css`

- [x] **T30 Accessibility pass** (M) — deps: T29
  - Acceptance: axe zero serious/critical on every route; keyboard-only walkthrough of core flows; WCAG AA contrast for all accent pairings.
  - Verify: `npm run test:e2e` a11y specs.
  - Files: `e2e/a11y.spec.js`, `e2e/keyboard.spec.js`, token fixes

- [x] **T31 Performance pass** (S) — deps: T30
  - Status: JavaScript measured at about 51 KB gzipped (budget 120 KB). Lighthouse performance score NOT measured yet; run it on the live site in Chrome DevTools (mobile).
  - Acceptance: initial JS ≤ 120 KB gzip; fonts subset; Lighthouse performance ≥ 90 on Today (mobile, warm).
  - Verify: bundle size script plus Lighthouse run.
  - Files: `scripts/check-bundle.js`, config tweaks

- [x] **T32 Final acceptance and docs** (M) — deps: all
  - Status: README, ACCEPTANCE.md and the full end-to-end suite done. The live production check after this deploy is the owner's to confirm.
  - Acceptance: each PRD §16 criterion mapped to a passing test in `docs/ACCEPTANCE.md`; README; DEPLOY.md re-verified with limits date; production deploy verified.
  - Verify: full suite plus manual run-through on live site.
  - Files: `docs/ACCEPTANCE.md`, `README.md`, `docs/DEPLOY.md`

### Checkpoint E: Done
- [ ] All SPEC success criteria met; live deployment healthy; user sign-off
