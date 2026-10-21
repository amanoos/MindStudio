# Claude API notes (verified)

Checked on 2026-10-20 against Anthropic's current documentation (platform.claude.com: Messages API,
Models overview, Structured outputs, Extended/adaptive thinking, Effort, Define tools, Errors) and
public reports on browser access. Re-check before changing `src/lib/ai/claude.js`.

## Request

- `POST https://api.anthropic.com/v1/messages`
- Headers: `x-api-key: <key>`, `anthropic-version: 2023-06-01`, `content-type: application/json`.
- **Browser calls also need** `anthropic-dangerous-direct-browser-access: true`. Without it the API
  answers 401 "CORS requests must set ...". The name is a reminder that the key is exposed to the
  page, which is why the app has a strict CSP and plain warnings.
- Body: `model`, `max_tokens`, `system`, `messages: [{ role: "user", content: "..." }]`.

## Models we list

| Label      | Id                  | Price per MTok in / out | Notes                                            |
| ---------- | ------------------- | ----------------------- | ------------------------------------------------ |
| Sonnet 5.5 | `claude-sonnet-5-5` | $2 / $10                | Default. Cannot send `thinking: disabled`.       |
| Haiku 5.5  | `claude-haiku-5-5`  | from $0.10 / $0.50      | Cheapest. Accepts `thinking: {type:"disabled"}`. |
| Opus 5.5   | `claude-opus-5-5`   | $4 / $20                | Thinking always on; lower it with `effort`.      |
| Fable 5.1  | `claude-fable-5-1`  | $10 / $50               | Thinking always on; lower it with `effort`.      |

All: 1M context, 128K max output.

## Difference from the first spec

`tool_choice` of type `tool` or `any` returns **400** on Sonnet 5.5, Opus 5.5 and Fable 5.1
("not supported for this model"). So a forced tool call cannot be the structured-result mechanism.
Use **structured outputs** instead.

## Structured outputs

```json
"output_config": { "format": { "type": "json_schema", "schema": { } } }
```

- No beta header. Supported on all four models above.
- Schema rules: `additionalProperties: false` on every object, every property listed in
  `required`; no `minLength`/`maxLength`, no `minItems`/`maxItems` beyond 0 or 1, no numeric
  bounds, no recursion. So counts, ranges and "distinct" are checked by our validator.
- The JSON arrives **as a string** in a `text` content block. Find the block by `type`, not by
  position (thinking blocks may come first), then `JSON.parse`.
- `stop_reason: "max_tokens"` means the JSON may be cut off: retry once with a higher cap.
  `stop_reason: "refusal"` arrives with HTTP 200 and is billed: do not parse it.
- Not confirmed in the docs: whether `output_config.format` combines with adaptive thinking on every
  model. We keep thinking minimal (below); the owner's first real try-out is the check, and the
  client surfaces any 400 message plainly.

## Thinking and effort

- Thinking is adaptive and **counts toward `max_tokens`**, so give a generous cap (3000).
- `output_config.effort`: `low`, `medium`, `high`, `xhigh`, `max`. We send `low`.
- Sonnet 5.5: `thinking: {type:"between_tools"}` is the lightweight option (works at low to
  high effort; 400 at xhigh/max).
- Haiku 5.5: `thinking: {type:"disabled"}` is allowed at high effort or below.
- Opus 5.5 and Fable 5.1: thinking cannot be disabled; rely on `effort: "low"`.
- Do not ask for "step-by-step reasoning" as a field name (it can trigger a `reasoning_extraction`
  refusal). Ask for a short explanation.

## Errors

Body: `{ "type": "error", "error": { "type", "message" }, "request_id" }`; header `request-id`.

| Status | Type                    | Our message                                                       |
| ------ | ----------------------- | ----------------------------------------------------------------- |
| 400    | `invalid_request_error` | Show the API's message (also used when a spend limit is reached). |
| 401    | `authentication_error`  | The key was not accepted.                                         |
| 402    | `billing_error`         | Billing problem on the Anthropic account.                         |
| 403    | `permission_error`      | The key may not use this model.                                   |
| 404    | `not_found_error`       | Model not found (pick another in settings).                       |
| 413    | `request_too_large`     | Should not happen (limit 32 MB).                                  |
| 429    | `rate_limit_error`      | Slow down or spend cap; one retry honoring `retry-after`.         |
| 500    | `api_error`             | Anthropic had a problem; try again.                               |
| 504    | `timeout_error`         | Try again.                                                        |
| 529    | `overloaded_error`      | Busy; one retry.                                                  |

## Sources

- https://platform.claude.com/docs/en/api/messages
- https://platform.claude.com/docs/en/about-claude/models/overview
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking
- https://platform.claude.com/docs/en/build-with-claude/effort
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- https://platform.claude.com/docs/en/api/errors
- Direct browser access header: Anthropic's CORS announcement and community reports (for example
  Simon Willison's write-up).
