VOCABULARY
& MIND STUDIO

Product Requirements Document

A personal learning web app for vocabulary depth, curiosity, and lifelong mental engagement

Version 1.0  |  October 20, 2026
Prepared for a fluent, educated adult English learner

# 1. Executive Summary

Vocabulary & Mind Studio is a personal, web-based learning companion designed for an educated, professionally experienced adult who speaks English fluently but learned it as a second language. The goal is not remedial English. It is to deepen expressive precision, discover less familiar words, understand how language evolves, and keep curiosity and thinking active through short, rewarding daily sessions.

The core experience presents five carefully selected words each day. Each word includes a clear definition, pronunciation, nuanced synonyms, example sentences, register and usage notes, etymology, historical development when reliably documented, and a practical prompt that encourages the learner to use the word. The system maintains a permanent word history and checks it before scheduling new words so featured words are not repeated.

To avoid making the product feel like a dictionary, the app also offers optional daily mind-stretchers: short logic puzzles, lateral-thinking questions, mini history/science/culture lessons, writing prompts, memory practice, and spaced-repetition reviews.

# 2. Product Vision and Principles

- Respect the learner: assume fluency, professional experience, and strong general comprehension; avoid school-like or patronizing language.
- Teach depth, not just rarity: prioritize useful, expressive words that help with conversation, writing, reading, and nuanced thought rather than obscure words chosen only for novelty.
- Make history memorable: explain word origins and semantic shifts as a story, clearly distinguishing documented facts from uncertain theories.
- Support active recall: make the learner retrieve, compare, and use words instead of only reading definitions.
- Keep the daily habit light: aim for a 10–20 minute session, with optional deeper exploration.
- Be transparent: show source links, confidence, and attribution; never invent etymologies or historical quotations.
- Be inclusive: use accessible typography, keyboard support, responsive layouts, and adjustable difficulty.
# 3. Goals, Non-Goals, and Success Measures

## 3.1 Goals

- Deliver five new, non-duplicate vocabulary words per local calendar day.
- Build a searchable personal archive of all featured words, learning status, notes, and review results.
- Improve recall, word-choice precision, and confidence using unfamiliar vocabulary in context.
- Offer optional short activities that stimulate curiosity and reasoning beyond vocabulary.
- Use free or free-tier services where practical and keep the app inexpensive to operate.
## 3.2 Non-goals for the first release

- No claim to diagnose, prevent, or treat cognitive decline or any medical condition.
- No social network, public leaderboard, paid course marketplace, or complex gamification economy.
- No reliance on a generative AI model for every daily page; curated and cached content should keep cost and factual risk low.
- No automatic translation requirement. Optional Filipino-language glosses may be explored later, but English-first explanations are the default.
## 3.3 Success measures

| Metric | Initial target / definition |
| --- | --- |
| Daily completion | Learner views or completes at least 4 of 5 word cards. |
| Recall | Review quiz accuracy improves over a rolling 4-week period. |
| Retention | Learner can recall or use a meaningful share of words after 7 and 30 days. |
| Novelty | Zero duplicate headwords in the featured-word history, with configurable handling of inflections and alternate senses. |
| Habit | At least 4 learning sessions per week after the first month, if the learner chooses a daily routine. |
| Trust | Every etymology and source-based historical claim has a source link or is explicitly marked uncertain. |

# 4. Target User and Learning Profile

| Attribute | Product implication |
| --- | --- |
| Age / life stage | Designed for an adult learner; never infantilize the interface or examples. |
| Language background | English is a second language, but the learner is fluent and comfortable conversing. |
| Education / career | College graduate and professional; explanations can include nuance, register, rhetoric, history, and abstract ideas. |
| Primary need | Expand expressive range and cultural/language knowledge, not basic grammar instruction. |
| Preferred cadence | Five new words daily, plus brief reviews and optional enrichment. |
| Likely device | Responsive desktop-first web app with excellent mobile usability. |
| Motivation | Curiosity, precision, intellectual play, and lifelong learning rather than grades. |

# 5. Core User Journey

1. Open the dashboard and see today's date, five new words, estimated time, and a small optional mind-stretcher.
1. Explore each word card: hear pronunciation where available, read definition and examples, expand word history, compare synonyms, and see usage/register notes.
1. Answer a one-question check or write a sentence using the word; mark confidence as Again / Hard / Good / Easy.
1. Save a personal note, favorite a word, or flag an inaccurate/unclear entry.
1. At the end, take a short five-question recall check or skip it without penalty.
1. Return on later days for five fresh words and spaced-repetition reviews of earlier words.
# 6. Functional Requirements

## 6.1 Daily Word Selection and Scheduling

- Generate or curate exactly five new headwords per user-local day. If the user misses a day, do not silently dump all missed sets on the next visit; offer a catch-up option.
- Before publication, normalize each candidate (case folding, whitespace, punctuation, lemma/inflection handling) and compare against the full featured-word ledger.
- Avoid near-duplicates and trivial variants by default (e.g., singular/plural, common inflections, hyphenation variants); allow a new distinct sense only when it provides substantial learning value and is clearly labeled.
- Use a balanced mix: high-utility advanced vocabulary, vivid precise words, literary/rhetorical terms, idioms or phrasal expressions occasionally, and words with compelling histories.
- Rotate domains (everyday precision, work and communication, literature, science, history, philosophy, arts, social concepts) without making every set feel artificially themed.
- Avoid slurs and unnecessarily offensive terms in normal daily sets. If a sensitive term is educationally necessary, label context and let the learner skip it.
- Allow an editorial/admin review state before a word becomes part of the published daily set.
## 6.2 Word Detail Card

| Field | Requirement |
| --- | --- |
| Headword and part of speech | Display standard spelling, part(s) of speech, and common inflections where relevant. |
| Pronunciation | IPA or readable respelling plus audio when a reliable free source is available. |
| Plain-English definition | Concise, precise explanation; include multiple senses only when relevant. |
| Nuance and register | Explain whether the word is formal, conversational, literary, technical, dated, regional, approving, disapproving, etc. |
| Synonyms and contrasts | Provide 3–8 related terms with short distinctions; include antonyms where useful. Avoid pretending synonyms are interchangeable. |
| Examples | At least two natural examples: one everyday/professional and one richer contextual example. Label invented examples as app-written. |
| Etymology | Trace language roots and source forms when documented; explain literal meaning if helpful. |
| Historical transformation | Summarize dated/attested changes in meaning, spelling, pronunciation, or usage. Include dates only when supported. |
| Current usage | Explain modern connotation, collocations, common mistakes, and contexts where the word fits. |
| Memory hook | A short association, contrast, image, or word-family link; never replace the real etymology with a false mnemonic. |
| Practice | One prompt requiring the learner to choose, recall, compare, or use the word. |
| Sources | Clickable source links and attribution/license details for external dictionary content. |

## 6.3 Review and Retention

- Maintain per-word states: New, Learning, Familiar, Mastered, and Revisit.
- Offer a spaced-repetition schedule, initially around 1, 3, 7, 14, and 30 days, adjusted by learner response rather than treated as scientifically exact.
- Support flashcards, multiple choice, fill-in-the-blank, synonym discrimination, sentence completion, and free-response usage.
- Let the learner rate recall as Again / Hard / Good / Easy; store each attempt with date and outcome.
- Use retrieval practice and context-rich questions. Do not count merely opening a card as mastery.
- Allow review filters by topic, part of speech, confidence, saved words, and words due today.
## 6.4 Personal Wordbook

- Search and filter all featured words, including date first featured, definition, topic, and mastery state.
- Show a clear history and guarantee that previously featured headwords are excluded from future new-word selections.
- Allow favorites, personal notes, tags, and export to CSV/JSON.
- Support an explicit 'revisit this word' action without treating a review as a new feature or breaking the no-repeat rule.
- Provide a duplicate-audit screen for administrators and a way to merge accidentally duplicated records.
# 7. Enrichment Modules: Keep the Mind Curious

These are optional modules. Start with two or three in the MVP; add others only if they sustain engagement.

| Module | Typical session | Learning benefit / example |
| --- | --- | --- |
| Daily Brain Teaser | 2–5 minutes | Logic grid, pattern, probability intuition, lateral-thinking riddle; reveal reasoning after the answer. |
| Curiosity Capsule | 3–6 minutes | A concise lesson about a surprising idea in history, science, geography, art, technology, or culture, with sources and a follow-up question. |
| Critical Thinking Lab | 3–8 minutes | Spot a hidden assumption, distinguish correlation from causation, evaluate a claim, or identify a cognitive bias. |
| Writing Gym | 3–7 minutes | Rewrite a paragraph for clarity, use two new words naturally, summarize an argument, or choose the most precise word. |
| Memory Workshop | 3–5 minutes | Recall yesterday's words, associate concepts, build a story, and practice retrieval rather than passive rereading. |
| Quote / Rhetoric Explorer | 3–5 minutes | Examine a short, properly attributed public-domain quotation or licensed excerpt; explain metaphor, tone, and argument. |
| Science of Everyday Life | 3–6 minutes | Explain why common phenomena occur, followed by a prediction or small safe observation. |
| History Through an Object | 4–8 minutes | Trace an everyday object, invention, or custom through time and connect it to social change. |
| Number Sense | 2–5 minutes | Estimation, probability, charts, and practical quantitative reasoning without a speed test. |
| Learn Something Deeply | 10–20 minutes | A weekly guided mini-course with a few checkpoints and a saved progress trail. |

Recommended MVP enrichment combination: Daily Brain Teaser, Curiosity Capsule, and Critical Thinking Lab. They are varied, self-contained, and can be delivered without expensive media or elaborate course infrastructure.

# 8. Content Quality, Accuracy, and Editorial Policy

- Never fabricate etymology, first-use dates, historical quotations, or frequency claims. If evidence is weak or sources disagree, say so plainly.
- Distinguish an etymological origin from a memory aid. Label disputed origins as disputed.
- Prefer primary or reputable references for historical claims; use dictionary data as a starting point, not unquestioned truth.
- Use original app-written examples unless source licensing explicitly permits reproduction. Do not copy long dictionary definitions or example sentences wholesale.
- Show source name, link, access date where useful, and any required attribution or share-alike notice.
- Include a feedback action ('Report an issue') that captures word, field, source, and optional comment.
- Use an editorial confidence field: Verified, Needs Review, or Uncertain. Only Verified items are eligible for automated daily publication by default.
- AI may draft explanations and practice questions, but the system should validate against sources, flag unsupported details, and require review for uncertain etymology or sensitive content.
# 9. Suggested Free / Free-Tier Data Sources

API availability, quotas, licensing, and terms can change. Verify the current terms before launch, especially caching, redistribution, attribution, and commercial use. The app should store its own learning ledger and app-authored educational summaries; do not assume every upstream API permits unrestricted caching.

| Source | Potential use | Cautions / implementation note |
| --- | --- | --- |
| FreeDictionaryAPI.com | Definitions, pronunciations, etymology and other Wiktionary-derived structured fields. | No API key advertised; 1,000 requests/hour per IP; Wiktionary CC BY-SA 4.0 attribution/share-alike requirements apply. Cache only as permitted; link original entry. |
| Wiktionary | Etymology, pronunciations, synonyms, language history, examples, word families. | Crowdsourced and uneven; content licensing and attribution must be respected. Prefer official endpoints/data and avoid brittle scraping. |
| Merriam-Webster Dictionary API | High-quality definitions, etymologies, audio, synonyms/antonyms. | Free for non-commercial use within stated limits (up to 1,000 queries/day and two reference APIs); requires API key. Confirm current terms. |
| Wordnik | Definitions, examples, related words, pronunciations, word of the day/random words. | Free Basic plan has limits and non-commercial/research restrictions; no caching on Basic per FAQ; attribution required. Not the default if permanent caching is needed. |
| Project Gutenberg / public-domain texts | Historical context and public-domain reading snippets for enrichment. | Confirm work's copyright status for the relevant jurisdiction and respect site policies; keep excerpts short and cited. |
| Wikimedia projects | Background for curiosity capsules and context. | Check each page's citations and license; link source and comply with attribution/share-alike requirements. |
| Open-Meteo or other open datasets (optional) | Small data-literacy exercises using weather or public data. | Not necessary for MVP; verify service-specific attribution and usage limits. |

Useful starting links:

- Free Dictionary API: https://freedictionaryapi.com/
- Merriam-Webster Developer Center: https://www.dictionaryapi.com/
- Wordnik Developer Center: https://developer.wordnik.com/
- Wiktionary: https://en.wiktionary.org/
- Project Gutenberg: https://www.gutenberg.org/
# 10. Technical Architecture Recommendation

Recommended approach for a solo developer familiar with .NET and SQL Server: a responsive Blazor Web App on a supported .NET release, with a relational database for users, word history, reviews, and content metadata. Use a modular monolith for the first version rather than microservices.

| Layer | Recommendation |
| --- | --- |
| Frontend | Blazor Web App + MudBlazor or equivalent component library; responsive layout, accessible controls, light/dark theme. |
| Application | ASP.NET Core services organized by feature: DailyWords, Wordbook, Reviews, Enrichment, ContentSources, Admin/Editorial. |
| Persistence | PostgreSQL on a generous free tier, or SQL Server if already available. For a personal prototype, SQLite is sufficient. Use EF Core migrations. |
| Scheduling | A daily background job or hosted service generates candidate sets ahead of time, validates duplicates, and publishes five words per user timezone/day. |
| External data | Typed HTTP clients, timeouts, retry/backoff, rate limiting, source attribution metadata, and response validation. |
| Content pipeline | Candidate pool -> normalize/dedupe -> enrich from sources -> generate app-authored explanations -> validate -> editorial status -> daily publication. |
| Authentication | For a personal-only app, simple single-user authentication or trusted private deployment; if multi-user later, use a proven identity provider. |
| Hosting | Start with a free-tier web host and managed database only after checking current quotas, sleep/idle behavior, storage, and bandwidth. Self-hosting on a home server is an alternative. |
| Observability | Structured logs, failed-source status, duplicate-block events, generation run history, and a simple admin health page. |
| Backups | Automated database backup/export and a tested restore process; include personal notes and review history. |

## 10.1 Important architecture decision: avoid daily live dependence on APIs

Do not call multiple dictionary APIs every time the learner opens a word. Build and validate content ahead of time, store only content permitted by its license, and preserve source links and attribution. If a source's terms prohibit caching, request the data at display time or choose another source. Keep user progress and the no-repeat ledger under your own control.

# 11. Conceptual Data Model

| Entity | Key fields / purpose |
| --- | --- |
| Word | WordId, normalizedHeadword, displayHeadword, partOfSpeech, difficulty, topic, status, createdAt. |
| WordContent | WordId, definition, nuance, pronunciation, synonyms, contrasts, examples, etymology, historicalNotes, currentUsage, memoryHook, confidence. |
| WordSource | WordId, sourceName, sourceUrl, fieldSupported, attributionText, license, retrievedAt. |
| DailySet | DailySetId, userId, localDate, timezone, publicationStatus, createdAt. |
| DailySetWord | DailySetId, WordId, displayOrder; unique constraint on set + word. |
| FeaturedWordLedger | UserId, WordId, firstFeaturedAt, firstFeaturedDate; unique constraint on normalized headword per user or global policy. |
| ReviewState | UserId, WordId, learningState, dueAt, interval, ease/strength parameter, lastReviewedAt. |
| ReviewAttempt | AttemptId, UserId, WordId, activityType, result, confidenceRating, answeredAt. |
| UserWordNote | UserId, WordId, note, favorite, tags, createdAt, updatedAt. |
| EnrichmentActivity | ActivityId, type, title, content, answer/explanation, sources, difficulty, status. |
| ActivityAttempt | UserId, ActivityId, response, result, completedAt. |
| GenerationRun | RunId, startedAt, completedAt, status, source calls, duplicate rejections, error details. |

Integrity rules: enforce duplicate prevention in the database with normalized keys and unique constraints; application-level checks alone are not sufficient. Keep a distinct review event from a new featured-word event.

# 12. Core Business Rules

- A published daily set contains exactly five distinct eligible words.
- A headword already present in the learner's featured-word ledger cannot be selected as new again.
- If fewer than five eligible words are available, the system should alert the admin or use a pre-reviewed reserve pool rather than publish duplicates.
- Only content meeting the configured confidence threshold may be auto-published.
- A source outage must not erase history or block review of already stored content.
- The learner can revisit a word at any time; revisiting is not a repeat feature.
- The app should distinguish a word's headword from a sense, phrase, and inflected form so duplicate rules are predictable.
- Daily boundaries follow the user's configured timezone; date changes must not accidentally generate two sets.
# 13. UX / Navigation

| Screen | Main elements |
| --- | --- |
| Today | Five-word progress, today's cards, quick review, one optional enrichment activity, streak shown gently (no guilt messaging). |
| Word Detail | Definition, pronunciation, examples, nuance, synonyms/contrasts, word history, sources, practice and notes. |
| My Wordbook | Search, filters, favorites, learning state, date featured, export. |
| Review Session | Due words, mixed question types, immediate explanations, Again/Hard/Good/Easy rating. |
| Mind Studio | Brain teaser, curiosity capsule, critical-thinking prompt, writing gym and activity history. |
| Progress | Words encountered, review accuracy, due backlog, self-rated confidence, weekly consistency; avoid implying medical cognitive measurement. |
| Settings | Daily reminder preference, timezone, session length, topic mix, difficulty, accessibility, data export/delete. |
| Content Admin | Candidate queue, duplicate report, source/attribution preview, confidence flags, publish/reject, generation logs. |

# 14. Non-Functional Requirements

- Performance: dashboard usable within 2 seconds on a typical broadband connection, excluding cold starts of free hosting.
- Availability: cached daily content and review sessions remain available when upstream dictionary services are down.
- Security: HTTPS, secure secret storage, server-side API keys, input validation, rate limiting, least-privilege database access.
- Privacy: collect only data needed for learning; private notes stay private; provide export and deletion.
- Accessibility: keyboard navigation, visible focus, semantic headings, sufficient contrast, scalable text, and reduced-motion support.
- Reliability: database constraints prevent duplicates; failed jobs are observable and retry safely.
- Portability: standard relational schema and documented deployment configuration; avoid lock-in to a single AI provider.
- Cost: MVP should function without a paid LLM. AI enhancement must be optional, budget-limited, and replaceable.
# 15. MVP Scope and Delivery Plan

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| Phase 1 — Foundation | Single-user login, database schema, daily dashboard, wordbook, normalized duplicate ledger. | Five seeded words display; refresh/redeploy does not lose history; duplicate test passes. |
| Phase 2 — Learning loop | Word detail, notes/favorites, review questions, confidence ratings, spaced-repetition queue. | Learner can review due words and see history/state changes. |
| Phase 3 — Content pipeline | Free dictionary-source integration, attribution, candidate review queue, pre-generation, source outage handling. | No unreviewed or duplicate word is published; source failures are logged. |
| Phase 4 — Mind Studio | Brain teaser, curiosity capsule, critical-thinking prompt, activity history. | At least three activity types work end-to-end and have explanations/sources. |
| Phase 5 — Polish | Responsive/accessibility pass, export, backups, reminder option, progress page. | Export/restore verified; mobile and keyboard flows tested. |

## 15.1 MVP feature priority

| Priority | Features |
| --- | --- |
| P0 — Must have | Five new words/day; no-repeat ledger; rich word cards; source links; wordbook search; basic quiz/review; backup/export. |
| P1 — Should have | Spaced repetition; notes/favorites; brain teaser; curiosity capsule; progress view; source failure handling. |
| P2 — Later | Audio for every word; adaptive topic/difficulty; weekly mini-courses; browser/PWA notifications; optional Filipino glosses; import/export to Anki. |
| P3 — Experimental | AI conversation practice; personalized reading passages; speech recording and feedback; social sharing. |

# 16. Acceptance Criteria

- Given a word has been featured previously, when daily selection runs, that word is rejected before publication.
- Given two candidate spellings normalize to the same headword, only one can be featured as new.
- Given the learner opens today's dashboard multiple times, the same five words remain assigned for that local date.
- Given an upstream API fails, the app still displays saved word content and supports reviews.
- Given an etymology is uncertain or unsupported, the system labels it uncertain or blocks publication rather than inventing a confident explanation.
- Given a source requires attribution, its required attribution and link appear wherever the relevant data is displayed.
- Given a learner rates a word 'Again', its review due date is brought forward according to the scheduler.
- Given the learner exports their wordbook, headwords, content metadata, sources, notes, and learning states are included in a documented format.
- Given the learner uses only a keyboard, all core actions can be completed with visible focus and no keyboard trap.
- Given the learner changes timezone, existing featured history remains intact and future daily sets use the new local date correctly.
# 17. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Incorrect or overconfident etymology | Source every historical claim; confidence labels; editorial gate; show uncertainty. |
| API quotas or terms change | Use provider adapters, monitor errors, maintain a reviewed reserve pool, re-check licensing periodically. |
| Duplicates through spelling/inflection variants | Canonical normalization, lemma metadata, synonym/near-duplicate review, database unique constraints. |
| Daily content becomes too obscure | Balance usefulness and novelty; tune topic/difficulty based on feedback. |
| App feels like homework | Short sessions, choice, no punitive streaks, playful activities, skip options. |
| Free hosting sleeps or changes limits | Test actual cold-start behavior, keep backups, allow self-hosting, avoid hard dependence on one provider. |
| AI hallucinations | AI drafts only; citations and validation required; never publish unsupported facts automatically. |
| Copyright/license misuse | Prefer open data, app-authored explanations, attribution, license tracking, and review before redistribution. |

# 18. Sample Daily Experience

Illustrative structure only; these sample words are not a permanent seed list and should be checked against the actual ledger before use.

| Word | Learning angle | Practice prompt |
| --- | --- | --- |
| Perspicacious | Sharp discernment; distinguish it from merely being intelligent or observant. | Describe a moment when someone noticed a subtle implication. |
| Equivocal | Ambiguous or open to multiple interpretations; compare with vague and evasive. | Rewrite an equivocal workplace statement so its meaning is explicit. |
| Sanguine | Optimistic, especially in a difficult situation; note its tone and common collocations. | Write one sanguine sentence that is realistic rather than naïve. |
| Intransigent | Unwilling to compromise; distinguish firmness from inflexibility. | Explain a situation where intransigence helped or harmed a negotiation. |
| Palimpsest | Something reused or layered so traces of an earlier form remain; explore literal and metaphorical uses. | Describe a city, building, or tradition as a palimpsest. |

Each sample card should also include verified etymology, pronunciation, two examples, related words, source links, and a short recall question before publication.

# 19. Open Questions / Decisions to Confirm

- Personal-only or designed for multiple users from the beginning?
- Preferred hosting: self-host on a Windows machine, free cloud hosting, or either?
- Daily reminder: email, browser notification, or no reminder?
- Content style: more literary and sophisticated, more practical/professional, or a balanced mix?
- Should optional Filipino-language comparisons be included, or should the app remain English-only?
- Should the app use an LLM for polished word-history narratives, or prefer deterministic source-based summaries for the first version?
# 20. Definition of Done

The MVP is done when a learner can open the app on desktop or mobile, receive five new words without repeats, explore reliable and attributed word histories, practice and review older words, maintain a searchable personal wordbook, complete at least three short enrichment activity types, and export/restore personal learning data. The app must continue to function when an external dictionary API is unavailable and must not publish unsupported historical claims as fact.

# Appendix A — Suggested Build Sequence for a .NET Developer

1. Create a Blazor Web App solution with feature folders and EF Core migrations.
1. Implement Word, WordContent, WordSource, DailySet, FeaturedWordLedger, ReviewState, and ReviewAttempt.
1. Seed 50–100 manually reviewed words to prove the learning loop before integrating APIs.
1. Build a duplicate-safe daily set generator and add database uniqueness constraints.
1. Add one dictionary adapter, source links, license/attribution fields, and a source-failure fallback.
1. Add the review scheduler and question types.
1. Add three enrichment activity templates with app-authored explanations and source links.
1. Add export, backups, logging, and deployment documentation.
1. Run acceptance tests for duplicate prevention, timezone boundaries, source failure, and export/restore.
# Appendix B — Source Notes

The source shortlist was checked on October 20, 2026. FreeDictionaryAPI advertises Wiktionary-derived data, no API key, a 1,000 requests/hour/IP limit, and CC BY-SA 4.0 data licensing/attribution. Merriam-Webster advertises free non-commercial API access within specified limits and requires an API key. Wordnik offers a Basic plan but documents usage limits, attribution requirements, and restrictions including no caching on Basic. Verify all terms at implementation time.

- FreeDictionaryAPI overview and terms: https://freedictionaryapi.com/
- Merriam-Webster API terms and signup: https://www.dictionaryapi.com/
- Wordnik pricing: https://developer.wordnik.com/pricing
- Wordnik FAQ / caching and attribution: https://developer.wordnik.com/faq
- Wiktionary English: https://en.wiktionary.org/
