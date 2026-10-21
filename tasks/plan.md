# Implementation Plan: Vocabulary & Mind Studio (SvelteKit)

Spec: [SPEC.md](../SPEC.md) (approved). PRD: `docs/Vocabulary_Mind_Studio_PRD.md`. Task checklist: [tasks/todo.md](todo.md).

## Overview

Build a single SvelteKit app (SQLite/libsql, Render + Turso as the main deploy target, Docker as secondary) that gives one learner five new never-repeated words per local day, rich flip-card word pages, spaced-repetition review, a searchable wordbook, and three Mind Studio activities, wrapped in a playful animated UI. All content is drafted by Claude, gated by an automated content linter, and shown with source links and Sourced/Uncertain labels.

## Architecture Decisions

- **Vertical slices, deploy early.** The first checkpoint ends with a live Render + Turso deployment of a skeleton showing today's five words. Hosting surprises (ephemeral disk, cold start, env handling) surface in week one, not at the end.
- **Design system before features.** Tokens, fonts, layout shell and the mascot are built in Phase 1 so every later screen is fun by default and nothing is restyled afterward.
- **Pure logic is isolated and TDD'd:** `normalize.js`, `srs.js`, date/timezone math, and the linter take no I/O, so they get fast unit tests.
- **Uniqueness lives in the DB.** `word.normalized_headword UNIQUE`, `daily_set.local_date UNIQUE`, `featured_ledger.word_id UNIQUE`. App checks are only a convenience.
- **Lazy daily generation inside a transaction.** No scheduler, so there is nothing to run on a sleeping free host. Concurrent requests resolve through the constraints.
- **Content is data, not code.** `content/*.json` plus the linter. Seeding is idempotent and runs on boot. Words ship in batches so content work can run in parallel with feature work.
- **Boot sequence:** migrate, then lint-validated seed, then serve. A failure stops the boot with a clear log line.
- **Content-honesty rule:** the linter rejects unsourced etymologies or dates. Debated origins are labeled `Uncertain`, never hidden.

## Dependency Graph

```
T1 scaffold ─┬─ T2 design shell ───────────────┬─ T10 flip/timeline ─ T14 completion fx
             ├─ T3 DB+migrations ─┬─ T5 content+seed ─┬─ T7 daily set + Today ─ T8 deploy
             │                    │                   ├─ T9 word detail ─ T11 notes
             │                    │                   └─ T18–T22 word batches
             ├─ T4 normalize ─────┘
             └─ T6 auth ──────────────────── (guards routes from T7 on)
T12 srs ─ T13 review ─ T14
T15 wordbook, T16 export/import, T17 settings  (need T5, T11, T13)
T23–T26 Mind Studio (need T3, T6; content parallel)
T27–T32 polish (need everything above)
```

## Parallelization

- T18–T22 (word content batches) only need the T5 schema and linter. They can run in separate sessions alongside T9–T17.
- T23–T26 content files can be drafted while earlier UI tasks proceed.
- Everything touching migrations, `db.js`, or the layout shell stays sequential.

## Phases and Checkpoints

1. **Foundation (T1–T8):** scaffold, design shell, DB, normalizer, content/seed, auth, daily set + Today, first deploy.
   **Checkpoint A:** live Render + Turso URL shows today's five words behind the passcode; redeploy keeps history; duplicate test passes.
2. **Learning loop (T9–T14):** word detail, flip card/timeline, notes, SRS, review session, completion effects.
   **Checkpoint B:** learn five words, review, rate Again/Good, see due dates change.
3. **Wordbook and data safety (T15–T17):** search/filter, export/import, settings.
   **Checkpoint C:** export, wipe, restore on a fresh DB reproduces everything.
4. **Content and Mind Studio (T18–T26):** ~100 words, three activity types, history.
   **Checkpoint D:** linter green on ~100 words; three activities work end to end.
5. **Polish and ship (T27–T32):** progress/word garden, issue reports/admin, illustration pass, a11y, perf, docs and final acceptance.
   **Checkpoint E:** all spec success criteria met; deployed.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Render/Turso setup needs the user's own accounts and a few clicks (Claude cannot create accounts) | High | T8 is a guided hand-off: Claude prepares `render.yaml`, `DEPLOY.md`, and exact values to paste; the user does only the account clicks. Local Docker verifies the image first. |
| Free-tier limits/behavior changed | Med | No host-specific code; `DEPLOY.md` says verify limits and records the check date; Docker fallback. |
| Etymology errors in Claude-drafted content | High | Linter requires sources; prefer well-documented words; Uncertain labels; Report button; "About our sources" note. User accepted residual risk. |
| Animation hurts performance or accessibility | Med | transform/opacity only, reduced-motion support from T2, bundle budget checked in T31. |
| Concurrency/timezone bugs create two sets for a date | High | DB unique constraint plus integration tests with parallel calls and DST/timezone edge cases (T7). |
| Cold start on Render free is slow | Low | Excluded by PRD; show a friendly "waking up" shimmer. |
| Too much scope | Med | P0/P1 only; audio, reminders, Anki, dictionary API deferred. |

## Definition of Done (every task)

`npm run lint && npm run check && npm test && npm run content:lint` pass; new behavior has a test; keyboard and reduced-motion respected for any UI; no secrets committed; the task's checkbox in `todo.md` ticked.

## Open Questions

- None blocking. The only user action required is the Render/Turso account steps in T8.
