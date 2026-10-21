# Vocabulary & Mind Studio

A friendly, animated learning companion for a fluent adult English learner. Five new words every
day, never repeated, each with its meaning, nuance, word history and sources. Short reviews that
make the words stick. A small studio of brain teasers, curiosity capsules and critical-thinking
prompts. All wrapped in a playful interface with Professor Hoot, an owl, as your guide.

Built from the product requirements in
[`docs/Vocabulary_Mind_Studio_PRD.md`](docs/Vocabulary_Mind_Studio_PRD.md) and the specification in
[`SPEC.md`](SPEC.md).

## What it does

- **Today:** five new words per local day, the same five on every visit, with a progress ring, a
  gentle streak (no guilt), and an optional "catch up on yesterday".
- **Word pages:** a flip card, meaning and nuance, related words and how they differ, examples, an
  animated word-history timeline, a memory hook, notes, favorites and tags, and every source with its
  license. Where a word's origin is genuinely unclear, the page says so.
- **Review:** spaced repetition (1, 3, 7, 14, 30 days) with four question types and Again / Hard /
  Good / Easy ratings.
- **Wordbook:** search and filter every word you have met, and export it as CSV or JSON.
- **Mind Studio:** 20 brain teasers, 15 curiosity capsules, 15 critical-thinking prompts, a history
  of what you tried, and a daily suggestion.
- **Exercise:** Word Nuance. Pick a word you have met (or type one) and Claude writes a sentence with a gap; choose the word that fits best among near-synonyms, then see the answer and why. You bring your own Claude API key: it is stored only in your browser and sent only to Anthropic. See [Using Word Nuance](#using-word-nuance).
- **Progress:** recall over four weeks, consistency, your own ratings, and a word garden that grows
  as you learn. Never a medical claim.
- **Settings:** timezone, review length, theme, text size, animation (full or calm), backup and
  restore.
- **Content admin:** the reserve of unused words, reader reports, and an integrity audit of the
  no-repeat rules.

## Using Word Nuance

1. Create a Claude API key in the Anthropic console. Make it a separate key and set a small monthly spend limit on it.
2. Open **Exercise**, paste the key, press **Save key**, then **Test connection**.
3. Open **Word Nuance**, pick a word, and press **Write one for me**.

The key lives only in this browser's local storage. It goes straight to `api.anthropic.com`; this app's server, database and backups never see it. Remove it any time with **Remove key**, and always on a shared computer. Default model is Sonnet 5.5; Haiku 5.5, Opus 5.5 and Fable 5.1 can be chosen. Your answers (not the key) are saved and included in backups. Notes on the API: [`docs/CLAUDE-API-NOTES.md`](docs/CLAUDE-API-NOTES.md).

## Tech

SvelteKit 3 and Svelte 5 in plain JavaScript (JSDoc types), SQLite through `@libsql/client` (a local
file, or Turso in the cloud), Node 22, no CSS framework. Vitest for unit and integration tests,
Playwright and axe for end-to-end and accessibility tests.

## Run it locally

```
npm ci
npm run dev            # http://localhost:5173 , passcode "hoot" unless you set APP_PASSCODE
```

Migrations run and the word library loads automatically on start. Copy `.env.example` to `.env` to
set your own passcode and secrets.

## Everyday commands

| Command                     | What it does                                                      |
| --------------------------- | ----------------------------------------------------------------- |
| `npm run dev`               | Dev server with hot reload                                        |
| `npm run build`             | Production build                                                  |
| `npm test`                  | Unit and integration tests                                        |
| `npm run test:e2e`          | Browser tests: accessibility, keyboard flows, PRD acceptance      |
| `npm run lint`              | ESLint and Prettier check                                         |
| `npm run check`             | Type check (JSDoc)                                                |
| `npm run content:lint`      | Validate every word and activity (sources, duplicates, structure) |
| `npm run content:links`     | Check that source links load (needs network)                      |
| `npm run check:bundle`      | Measure the JavaScript the Today page loads against its budget    |
| `npm run export` / `import` | Command-line backup and restore                                   |

The browser tests use Playwright. If its bundled browser is not installed, run them with an
installed one, for example `E2E_CHANNEL=chrome npm run test:e2e`.

## Deploy

Free cloud (Render and Turso) or Docker on your own machine: see [`docs/DEPLOY.md`](docs/DEPLOY.md).
Backups and the file format: [`docs/EXPORT-FORMAT.md`](docs/EXPORT-FORMAT.md). Where each
requirement is proven: [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md).

## How the content stays honest

All words and activities are written for this app, not copied from dictionaries.

- Every word links its sources, with license and attribution, and carries a **Sourced** or
  **Uncertain** label for its history. Uncertain histories say so in plain words.
- A content linter blocks anything with a missing source, an unsourced historical claim, a
  duplicate headword or an offensive term, before it can be loaded.
- The entries were drafted by an AI assistant from published references and were **not**
  independently fact-checked by a person. Each word page says so, links its sources, and has a
  "Report an issue" button that lands in the content admin.

## Layout

```
src/routes/          Pages: Today, word, review, wordbook, studio, exercise, progress, settings, admin
src/lib/ai/          Browser-only Claude client, key store and Word Nuance logic (no server imports)
src/lib/server/      Database, scheduling, daily set, review, export, stats (no UI)
src/lib/components/  Mascot, flip card, timeline, garden and other building blocks
content/             words/ and activities/ as JSON, plus the blocklist
db/migrations/       The database schema
tests/  e2e/         Unit and integration tests, and browser tests
docs/  tasks/        Deployment, formats, acceptance evidence, and the build plan
```

## Licence

MIT, see [`LICENSE`](LICENSE). Wiktionary text linked from the word pages is CC BY-SA 4.0.
