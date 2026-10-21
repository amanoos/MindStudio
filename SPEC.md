# Spec: Vocabulary & Mind Studio (JavaScript Edition)

Source: `docs/Vocabulary_Mind_Studio_PRD.md` (v1.0). This spec **overrides PRD §10 and Appendix A** (Blazor/.NET) with a lightweight JavaScript stack, and adds a playful, animated UI direction. All other PRD requirements (§§1–9, 11–14, 16–17) carry over unless noted here.

## Assumptions (correct me now or I proceed with these)

1. **Single-user, personal app.** One learner, one shared passcode. No user table; schema stays user-agnostic enough to add one later.
2. **One SvelteKit app, one process, one repo** (modular monolith by feature folder). The request does not split into independently shippable capabilities, so I skipped the Phase 0 capability map. Features (daily words, reviews, wordbook, Mind Studio, admin) share one data model.
3. **No background scheduler.** Free hosts sleep, so the daily set is generated lazily and idempotently on the first request of the user's local date.
4. **MVP content is a seed pool of ~100 words** (JSON files in the repo), per PRD Appendix A. **Claude drafts it end to end; the learner does no verification or editorial work.** No live dictionary API calls at read time. Dictionary-API import is a later phase, as PRD Phase 3 describes.
5. **No LLM on the server** (PRD §14). Words and activities are drafted at build time, and the server never calls a model. **Amendment (Exercise feature, see `SPEC-exercises.md`):** the optional Exercise page may call the Claude API **from the learner's own browser** with a key they enter and that stays in that browser; nothing else in the app uses an LLM. Content is drafted at build time, mixing literary, professional and "surprise me" words (PRD §8 balanced mix, with a deliberate share of delightful, unexpected words).
6. **English-only**, no reminders, no sensitive-word handling beyond avoiding offensive terms in the pool, no Filipino glosses in MVP.
7. **Modern evergreen browsers only.** Desktop-first, excellent on mobile.

## Objective

A fun, brain-stimulating daily companion for a fluent adult ESL learner. It delivers 5 new, never-repeated words per local day, with rich cards (definition, nuance, etymology, sources), spaced-repetition review, a searchable wordbook, and three short "Mind Studio" activities (Brain Teaser, Curiosity Capsule, Critical Thinking Lab).

The UI is a deliberate part of the product. Vivid colors, playful display fonts, a friendly mascot, illustrations, and purposeful animation make learning feel like play. Tone stays adult and never patronizing (PRD §2).

**Success** = PRD §20 Definition of Done, plus the UI success criteria below.

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **SvelteKit 3 + Svelte 5 (config lives in vite.config.js; internal imports use `#lib/...` via package.json "imports")**, plain JavaScript with JSDoc types (`checkJs`) | Compiles away the framework, tiny bundles, built-in transitions/springs/tweens for animation, SSR + forms that work without much JS |
| Runtime | Node 22 LTS, `@sveltejs/adapter-node` | Runs identically in Docker and on free Node/container hosts |
| Database | **SQLite via `@libsql/client`** (`file:` locally, `libsql://` Turso free tier in the cloud) | One driver, zero config locally, free persistent cloud DB, standard SQL, DB-level unique constraints |
| Migrations | Plain numbered `.sql` files plus a tiny runner (`db/migrations/`) | No ORM needed, easy to audit |
| Styling | Hand-written CSS with custom properties (design tokens); no CSS framework | Full control of the playful look, small payload |
| Animation | Svelte transitions/`spring`/`tweened`, CSS keyframes, **`canvas-confetti`** (~4 KB) for celebrations, inline animated SVG | Lightweight; all gated by `prefers-reduced-motion` |
| Fonts | Self-hosted via `@fontsource` (no Google runtime request): **Fredoka** (UI headings), **Fraunces** (headwords and etymology, a "wonky" serif), **Nunito** (body), **Caveat** (handwritten notes/margins) | Fun but readable; self-hosted for privacy and offline |
| Images | Inline SVG illustration set and mascot ("Professor Hoot," an owl), generated gradients/blobs, emoji-free icon set (`lucide-svelte`, tree-shaken) | No heavy photo payload |
| Tests | Vitest (unit/integration), Playwright (e2e, a11y via `@axe-core/playwright`) | Standard, fast |
| Lint/format | ESLint (`eslint-plugin-svelte`) + Prettier | |
| Container | Multi-stage Dockerfile (`node:22-alpine`) + `docker-compose.yml` with a named volume | Local deploy |

Estimated production dependencies: ≤ 8. Adding any more needs approval (see Boundaries).

## Deployment

**Free cloud (primary target): Render free web service + Turso free database**

- Render builds from the repo's Dockerfile (`render.yaml` blueprint committed). Render's free disk is ephemeral, so history lives in Turso. The first request after idle sleep is slow (PRD §14 excludes cold starts).
- `docs/DEPLOY.md` is a click-by-click guide: create Turso DB, copy URL/token, set env vars in Render, deploy. Migrations and seeding run automatically on boot, so there are no manual steps after deploy.
- **Koyeb** or **Hugging Face Spaces (Docker)** are alternatives that use the same image.

**Local Docker (also supported)**

- `docker compose up -d` serves the app on `http://localhost:3000`.
- SQLite file lives on the `mindstudio-data` volume (`/data/app.db`), so redeploys keep history.
- Config via env vars (`.env.example` committed, `.env` ignored): `APP_PASSCODE`, `SESSION_SECRET`, `DATABASE_URL` (default `file:/data/app.db`), `DATABASE_AUTH_TOKEN` (optional), `DEFAULT_TIMEZONE`.
- Boot runs migrations and seeding automatically (idempotent).
- Free-tier quotas change, so `docs/DEPLOY.md` must say "verify current limits" and record the date checked.
- No host-specific code. Only env vars differ. The `/healthz` endpoint reports DB connectivity.
- **Backup:** `npm run export` produces a JSON/CSV bundle. Settings has "Download backup" and "Restore from backup" (PRD P0).

## Commands

```
Install:        npm ci
Dev server:     npm run dev                 # http://localhost:5173
Build:          npm run build
Preview prod:   npm run preview
Unit/integ:     npm test                    # vitest run
Watch tests:    npm run test:watch
Coverage:       npm test -- --coverage
E2E + a11y:     npm run test:e2e            # playwright test
Lint:           npm run lint
Format:         npm run format
Typecheck:      npm run check               # svelte-check + JSDoc
Migrate DB:     npm run db:migrate
Seed words:     npm run db:seed             # idempotent; skips existing normalized headwords
Export backup:  npm run export -- --out backup.json
Import backup:  npm run import -- --in backup.json
Docker build:   docker build -t mind-studio .
Docker run:     docker compose up -d
```

## Project Structure

```
src/
  routes/
    +layout.svelte            → shell, nav, mascot, theme, page transitions
    +page.svelte              → Today (dashboard)
    word/[slug]/              → Word Detail
    review/                   → Review Session
    wordbook/                 → My Wordbook (search/filter/export)
    studio/                   → Mind Studio (+ /studio/[type])
    progress/                 → Progress
    settings/                 → Settings, backup/restore
    admin/                    → Content Admin (candidate queue, duplicate audit)
    login/  healthz/
  lib/
    server/
      db.js                   → libsql client, transaction helper
      auth.js                 → passcode login, signed cookie sessions
      daily/                  → set selection and idempotent publication
      normalize.js            → headword normalization (the only place the rules live)
      srs.js                  → spaced-repetition scheduler (pure functions)
      export.js
    components/               → WordCard, FlipCard, RatingButtons, Mascot, ConfettiBurst, ...
    styles/                   → tokens.css, base.css, animations.css
    assets/illustrations/     → SVG
content/
  words/*.json                → curated seed words (with sources + confidence)
  activities/*.json           → brain teasers, capsules, critical-thinking prompts
db/migrations/                → 001_init.sql, ...
scripts/                      → migrate, seed, export, import
tests/                        → unit + integration (mirrors src/lib/server)
e2e/                          → Playwright specs
docs/                         → PRD, DEPLOY.md, CONTENT-GUIDE.md, ADRs
Dockerfile  docker-compose.yml  .env.example  SPEC.md
```

## Data Model

Follows PRD §11, simplified for single-user. The notable constraints:

- `word(id, normalized_headword UNIQUE, display_headword, pos, difficulty, topic, status, confidence)`. **UNIQUE on `normalized_headword` is the no-repeat guarantee.**
- `word_content`, `word_source` (attribution and license per field).
- `daily_set(local_date UNIQUE, timezone, status)` and `daily_set_word(set_id, word_id, display_order, UNIQUE(set_id, word_id))`.
- `featured_ledger(word_id UNIQUE, first_featured_date)`. A review never writes here.
- `review_state(word_id PK, state, due_at, interval_days, ease, last_reviewed_at)` and `review_attempt(...)`.
- `user_word_note(word_id PK, note, favorite, tags)`.
- `activity`, `activity_attempt`, `generation_run`, `issue_report`.

**Normalization rules** (`normalize.js`): Unicode NFKC, case-fold, trim, collapse whitespace, strip punctuation and hyphen/space variants, then apply a simple inflection stemmer (plural, -ed, -ing). A manual `lemma_group` override covers the exceptions. Alternate senses may only be added through an explicit "new sense" admin action and are labeled as such.

## Key Behaviors

1. **Daily set (lazy, idempotent).** On the first request for the local date `D` (timezone from settings), a transaction picks 5 `verified`, never-featured words, rotating topics, and inserts `daily_set(D)`. If it already exists, it is returned unchanged. Concurrent requests resolve via the unique constraint. If fewer than 5 eligible words remain, publish nothing, show a friendly "reserve pool low" state, and flag it in admin (PRD §12). Timezone changes affect only future dates.
2. **Missed days.** No bulk dump. Today shows a "Catch up on yesterday?" opt-in card.
3. **Review loop.** Rating Again/Hard/Good/Easy updates `review_state` using the 1/3/7/14/30-day ladder, adjusted by rating (Again resets to 1 day and brings the due date forward). Question types in MVP: flashcard, multiple choice, fill-in-the-blank, synonym discrimination. Opening a card never counts as mastery.
4. **Source failure.** All content is read from the DB. Nothing depends on a live API at display time (PRD §10.1).
5. **Trust without homework.** The learner never reviews content. Instead, quality is enforced by rules and tooling:
   - Every word's etymology carries a source link and a confidence badge (Sourced / Uncertain). Where origins are debated or unclear, the card says so in plain words rather than guessing; the draft process prefers words with well-documented histories.
   - A build-time content linter (`npm run content:lint`, runs in CI and before seeding) fails on: missing sources, etymology or dates without a source, missing examples, duplicate normalized headwords, or offensive terms.
   - Both `Sourced` and `Uncertain` words may be auto-published (this replaces the PRD's "Verified only" gate; uncertainty is shown, not hidden). Words failing the linter are never seeded.
   - A one-tap "Report an issue" action stores word, field, and comment, shown in a simple admin list for optional use.
   - Honest limit: content is drafted by Claude from its knowledge and cited sources, not independently fact-checked by a human. The UI says so in an "About our sources" note.
6. **Mind Studio MVP:** Brain Teaser, Curiosity Capsule, Critical Thinking Lab. Each has a reveal-the-reasoning step, an explanation, sources, and activity history.
7. **Auth.** Passcode compared in constant time against `APP_PASSCODE`. Session is a signed, `HttpOnly`, `SameSite=Lax`, `Secure`-in-prod cookie. Login attempts are rate-limited.

## UI / Experience Direction ("make it a playground for the brain")

**Look and feel**

- **Palette (tokens in `tokens.css`):** warm cream canvas, with vivid accent families: grape purple, sunny yellow, coral, mint, sky blue. Each of the 5 daily cards gets its own accent. Light and dark themes. Dark mode uses deep indigo, not gray.
- **Shapes:** chunky rounded cards, soft layered shadows, blob and squiggle SVG backgrounds, sticker-style badges.
- **Typography:** Fredoka for chrome and headings, large Fraunces headwords, Caveat for the learner's notes and margin asides, Nunito for body. Generous line height. Text scales with the browser.
- **Mascot "Professor Hoot":** an SVG owl in the header and empty states. He blinks, tilts his head on hover, cheers on a streak, and sleeps when the day is complete. His messages are warm and never guilt-based (PRD §13).

**Animation catalog** (all disabled or reduced under `prefers-reduced-motion`, with a Settings toggle too)

- Page transitions (fade and slide), staggered card entrance on Today.
- **3D flip card:** the headword on the front, definition and etymology on the back.
- Etymology rendered as an **animated timeline** that draws itself as it scrolls into view.
- Rating buttons with spring press feedback; confetti burst on completing the 5 words, a perfect review, or a solved teaser.
- A progress ring for "words today" that fills with an easing animation.
- Brain-teaser reveal (curtain/unfold), wrong-answer gentle shake (never red alarm styling), and a correct-answer sparkle.
- Skeleton shimmer for loading states.

**Engagement without gamification bloat** (PRD non-goal): a gentle streak, a "word garden" on Progress where each learned word is a small plant that grows with its learning state (decorative, no points or leaderboards).

**Accessibility is non-negotiable:** keyboard operability, visible focus rings, semantic headings, WCAG AA contrast on every accent color pairing, `aria-live` for feedback, motion alternatives, and text-size support. Animation never carries meaning on its own.

**Performance budget:** Today is interactive in under 2 s on broadband (warm server). Initial JS ≤ 120 KB gzip. Fonts are subset (Latin) with `font-display: swap`. Illustrations are inlined or lazy-loaded SVG. Animations use `transform` and `opacity` only.

## Code Style

Plain JS, ES modules, JSDoc for types, small pure functions, feature-local files, no default exports for utilities. Prettier defaults, 2 spaces, single quotes, no semicolons-debates (Prettier decides).

```js
// src/lib/server/srs.js
/** @typedef {'again'|'hard'|'good'|'easy'} Rating */
const LADDER_DAYS = [1, 3, 7, 14, 30]

/**
 * Next review state after a rating. Pure: no I/O, no Date.now().
 * @param {{ step: number }} state  current ladder index (0-based)
 * @param {Rating} rating
 * @param {Date} now
 * @returns {{ step: number, dueAt: Date }}
 */
export function schedule(state, rating, now) {
  const step = nextStep(state.step, rating)
  const dueAt = new Date(now.getTime() + LADDER_DAYS[step] * 86_400_000)
  return { step, dueAt }
}
```

```svelte
<!-- components follow: props via $props(), tokens not hex codes, motion respects the user -->
<script>
  let { word, accent = 'grape' } = $props()
</script>

<article class="card" style:--accent="var(--{accent})">…</article>
```

Conventions: `kebab-case` filenames, `PascalCase.svelte` components, `camelCase` functions, `SCREAMING_SNAKE` constants. SQL is always parameterized. Server-only code stays in `src/lib/server` (imported as `#lib/server/...`). Colors, spacing, and durations come only from CSS tokens.

## Testing Strategy

| Level | What | Where |
|---|---|---|
| Unit (Vitest) | `normalize`, `srs`, timezone date math, rating transitions, export format | `tests/` |
| Integration (Vitest + in-memory libsql) | Daily-set idempotency and concurrency, ledger uniqueness, DB constraint rejects duplicates, migrations, export/import round trip | `tests/` |
| E2E (Playwright) | Login, view today's 5 words, flip card, review session, notes/favorite, wordbook search, Mind Studio activities, backup/restore | `e2e/` |
| A11y | axe scan on every route, keyboard-only walkthrough of core flows, reduced-motion emulation | `e2e/` |
| Visual smoke | Screenshot of Today in light/dark at mobile and desktop widths (review aid, not a gate) | `e2e/` |

The PRD §16 acceptance criteria each map to at least one automated test. Coverage target: ≥ 85% on `src/lib/server`; the UI is covered by e2e. Bug fixes use the Prove-It pattern (failing test first).

## Boundaries

- **Always:** run `npm run lint && npm run check && npm test && npm run content:lint` before committing; enforce uniqueness in the DB, not only in code; use parameterized SQL; keep content reads DB-only; honor `prefers-reduced-motion`; attribute sources and licenses wherever third-party data is shown; label invented examples as app-written.
- **Ask first:** adding any production dependency; schema changes after the first migration ships; adding a live dictionary API call; adding an LLM on the server; changing deploy targets or the CI config; adding a service worker/PWA.
- **Never:** commit secrets or `.env`; invent etymologies, dates, or quotations; publish content that fails the content linter or hides an `Uncertain` label; call external APIs at word-display time (the Exercise page's browser-side Claude call is the one approved exception, and the key never reaches the server); copy dictionary text wholesale; remove or weaken a failing test without approval; ship animation that cannot be turned off; use guilt-based streak messaging.

## Success Criteria

1. The app deploys to Render free + Turso by following `DEPLOY.md` with no manual DB steps, and history survives a redeploy.
2. `docker compose up` on a clean machine also works; data survives `docker compose down && up`.
3. Five distinct words per local date, stable across reloads and concurrent requests. Zero duplicate normalized headwords, enforced by a DB test.
4. All PRD §16 acceptance criteria pass in automated tests.
5. Review ratings schedule per the ladder, and "Again" moves the due date earlier.
6. Three Mind Studio activity types work end to end, with explanations and sources.
7. Export then restore on a fresh DB reproduces words, notes, states, and attempts exactly.
8. Axe scan has zero serious/critical violations; the core flows work keyboard-only.
9. UI: the animation catalog above is implemented, the 4 fonts and mascot are present, and the app is fully usable with reduced motion on.
10. Performance: initial JS ≤ 120 KB gzip; Lighthouse performance ≥ 90 on Today (mobile profile, warm server).

## Delivery Phases (adapted from PRD §15)

1. **Foundation:** scaffold, tokens/fonts/mascot shell, DB + migrations, auth, seed loader, normalizer, ledger, Today with 5 words.
2. **Learning loop:** Word Detail with flip card and timeline, notes/favorites, review session, SRS.
3. **Wordbook and data safety:** search/filter, export/import, Docker + deploy docs.
4. **Mind Studio:** three activity types and history.
5. **Polish:** progress and word garden, a11y and perf pass, issue reporting, admin queue and duplicate audit.
6. **(Later):** dictionary-API adapter, reminders, Anki export, audio.

## Open Questions

None blocking. Decisions recorded from the learner's answers: no manual verification (Claude drafts all content; linter and labels replace the editorial gate), cloud-first (Render + Turso), SvelteKit confirmed, owl mascot confirmed, content mix balanced with surprises, sensitive-word handling and Filipino glosses out of MVP.

Residual risk to accept: a few etymologies could be wrong despite sources. Mitigations are the linter, Uncertain labels, source links, and the Report button.
