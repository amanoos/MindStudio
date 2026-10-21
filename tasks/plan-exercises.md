# Implementation Plan: Exercise page and Word Nuance

Spec: [SPEC-exercises.md](../SPEC-exercises.md) (approved, decisions recorded). Task checklist:
[todo-exercises.md](todo-exercises.md). The original build plan ([plan.md](plan.md)) is finished and
is left untouched.

## Overview

Add an **Exercise** page with a first exercise, **Word Nuance**: pick a word you have met (or type
one), get an AI-written sentence or paragraph with one blank, choose the best word from the word and
its near-synonyms, then see the answer and the reasoning. Claude is called **directly from the
browser** with a key the learner enters and that lives only in `localStorage`. Attempts are saved to
the database and included in backups.

## Architecture decisions

- **Browser-direct calls, no server hop.** The only design that keeps the key in the browser. Code
  in `src/lib/ai/` imports nothing from the server, which is checked by a test.
- **No new dependency.** Plain `fetch`, behind a one-function provider interface
  (`generateNuanceItem`) so another provider could replace Claude later.
- **Forced structured output** (a tool schema) plus an independent **validator**: the UI trusts
  nothing the model returns until it has passed validation.
- **Security first, as a prerequisite.** A Content-Security-Policy for the whole app lands _before_
  any key can be stored, because it limits where scripts can run and where data can be sent.
- **Pure logic first, UI last.** Prompt builder, validator, key store and client are pure or
  mock-testable, so most of the risk is retired before any screen exists.
- **Test with mocks, always.** Unit tests mock `fetch`; browser tests mock the network route for
  `api.anthropic.com`. No test needs a key or spends money.
- **Verify the real API before coding against it** (the source-driven rule): task X1 records the
  current request shape, headers and model ids from Anthropic's documentation.
- **Honest data model.** One new table (migration `002`), included in backup and restore; older
  backups still load.

## Dependency graph

```
X1 verify API ──┬─ X3 key store + claude client ─┬─ X4 prompt + validator ──┐
X2 CSP + headers┘                                 │                          │
                                                  └─ X5 hub + nav + key panel┤
X6 migration + attempts + backup ─────────────────────────────────────────── X8 play UI ─ X9 history,
X7 word picker (met words / typed) ───────────────────────────────────────────┘          model, flag
                                                                                            │
                                                                                      X10 hardening,
                                                                                      e2e, docs
```

## Parallelization

- X3 and X4 are independent pure modules once X1 is done; X6 (database) and X7 (word picker) are
  independent of the AI modules. These can run in separate sessions.
- X2 (CSP) touches app-wide headers and must be sequential with everything that edits `hooks` or
  `vite.config.js`.

## Phases and checkpoints

1. **Foundations (X1 to X4):** API notes, CSP, key store and Claude client, prompt and validator.
   **Checkpoint F:** all unit tests green; CSP active and every existing browser test still passes;
   `npm run build` clean.
2. **Hub (X5):** Exercise page, navigation item, Claude connection panel.
   **Checkpoint G:** key can be saved, tested (mocked) and removed; works with no key; seven-item
   mobile nav looks right; axe clean.
3. **Word Nuance (X6 to X9):** database, word picker, play UI, history, settings.
   **Checkpoint H:** end-to-end with mocked Claude: choose word, generate, answer, see reasoning,
   history shows it, backup round trip includes attempts.
4. **Ship (X10):** security and keyboard e2e, docs, deploy, owner try-out with a real key.
   **Checkpoint I:** all spec success criteria met; deployed; one real call confirmed by the owner.

## Risks and mitigations

| Risk                                                                    | Impact | Mitigation                                                                                                                                  |
| ----------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A key in `localStorage` is readable by any script on the page           | High   | Strict CSP (X2), no third-party scripts, model text rendered as text, key read only inside one module, plain warnings in the panel (X5)     |
| CSP breaks existing pages (inline scripts, styles, confetti)            | High   | Do it first (X2); SvelteKit nonces for scripts; run all 22 existing browser tests plus a manual look; fix before any AI work                |
| The model returns a bad item (two good answers, no blank, wrong answer) | High   | Forced schema + strict validator (X4); optional second-opinion check (X9); "this seems unclear" flag; wrong-answer tone is gentle          |
| Anthropic's API details differ from what we assume                      | Med    | X1 verifies against current docs; model ids are a setting, not hard-coded; one place (`claude.js`) to change                                |
| Browser blocks the call (CORS) or a key lacks permission                | Med    | The documented direct-browser header; friendly errors for 401, 403, 429, 529, network and timeout; a Test button                            |
| Cost surprises                                                          | Med    | `max_tokens` cap, one retry only, no streaming loops, second-opinion off by default, spend-limit advice in the panel                        |
| Seven items crowd the mobile tab bar                                    | Low    | Checked at phone width in X5; shorten labels or tighten spacing if needed                                                                   |
| Free-host cold start delays the page, not the AI call                   | Low    | The AI call is browser-direct, so Render latency does not affect generation                                                                  |
| Schema change after the first deploy                                    | Med    | One small additive migration, applied automatically at boot; backup format stays backward compatible                                        |

## Definition of done (every task)

`npm run lint && npm run check && npm test` pass; new behavior has a test; no real API call in any
test; the key never appears in a log, URL, request to our server, backup or database; keyboard and
reduced motion respected for any UI.

## Open questions

- None. The owner accepted all recommendations. Remaining owner step: try one real call with their
  own key at Checkpoint I.
