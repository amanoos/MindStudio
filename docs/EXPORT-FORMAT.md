# Export and backup format

Three downloads are available from **Settings → Your data** (and the **Export** menu on My Wordbook),
and from the command line.

| File            | What it is                                             | Use it to                                   |
| --------------- | ------------------------------------------------------ | ------------------------------------------- |
| `backup.json`   | Everything you created or earned, in a restorable form | Restore progress on a new or reset database |
| `wordbook.csv`  | One row per word you have met, in a spreadsheet form   | Read or study in Excel, Sheets or Numbers   |
| `wordbook.json` | The same rows as the CSV, as JSON                      | Feed other tools                            |

Command line equivalents:

```
npm run export -- --out backup.json
npm run import -- --in backup.json     # replaces current progress; seed words first on a new database
```

## What a backup contains (and does not)

A backup holds **your** data: which words were featured and when, each day's set, review states and
every review attempt, notes, favorites and tags, Mind Studio attempts, issue reports, and your
settings (timezone, session length).

It does **not** contain the word entries themselves. Those ship with the app in `content/words/`.
Words in a backup are matched by their _normalized headword_, so a backup restores correctly even if
the database row numbers differ. Appearance choices (theme, text size, animation) are stored per
device and are not part of a backup.

Restoring **replaces** your current progress with the file's contents, all or nothing. If anything
goes wrong, nothing is changed. Entries for words the app does not know are skipped and counted.

## `backup.json`

```json
{
  "format": "mind-studio-backup",
  "version": 1,
  "exportedAt": "2026-10-21T09:30:00.000Z",
  "ledger": [{ "word": "sanguin", "date": "2026-10-20" }],
  "dailySets": [
    { "date": "2026-10-20", "timezone": "Asia/Manila", "words": ["sanguin", "equivocal"] }
  ],
  "reviewStates": [
    {
      "word": "sanguin",
      "state": "learning",
      "step": 1,
      "dueAt": "2026-10-21T09:00:00.000Z",
      "lastReviewedAt": "2026-10-20T09:00:00.000Z"
    }
  ],
  "reviewAttempts": [
    {
      "word": "sanguin",
      "activityType": "choice",
      "result": "correct",
      "rating": "good",
      "answeredAt": "2026-10-20T09:00:00.000Z"
    }
  ],
  "notes": [
    {
      "word": "sanguin",
      "note": "My sentence",
      "favorite": true,
      "tags": "work, formal",
      "updatedAt": "2026-10-20 09:05:00"
    }
  ],
  "activityAttempts": [],
  "issues": [],
  "settings": { "timezone": "Asia/Manila", "session_length": "15" }
}
```

- `word` is the normalized headword (lower case, punctuation and common endings removed), the key the
  app uses to prevent duplicates.
- `state` is one of `new`, `learning`, `familiar`, `mastered`, `revisit`. `step` is how far up the
  review ladder (1, 3, 7, 14, 30 days) the word has climbed, from 0 to 5.
- `rating` is `again`, `hard`, `good`, `easy` or `null` (for example a card you only opened).
- `version` changes only if the format changes in a way older files cannot be read. The app refuses
  files with a version it does not know.

## `wordbook.csv` and `wordbook.json`

One row per word you have been shown, oldest first. Columns:

| Column                 | Meaning                                                   |
| ---------------------- | --------------------------------------------------------- |
| `headword`             | The word as displayed                                     |
| `part_of_speech`       | For example `adjective`                                   |
| `topic`                | The topic it was filed under                              |
| `definition`           | The plain-English definition                              |
| `register`             | Formal, literary, neutral and so on                       |
| `etymology`            | The word-history summary                                  |
| `etymology_confidence` | `sourced` or `uncertain`                                  |
| `sources`              | Source name, link and license, separated by a pipe        |
| `first_featured`       | The local date the word first appeared                    |
| `learning_state`       | `new`, `learning`, `familiar`, `mastered` or `revisit`    |
| `due`                  | When the next review is due (UTC), blank if not scheduled |
| `favorite`             | `true` or `false`                                         |
| `tags`                 | Your tags, comma separated                                |
| `note`                 | Your note                                                 |

The CSV is UTF-8 with a byte order mark so accented text opens correctly in Excel. Any field that
begins with an equals sign, plus, minus or at sign is prefixed with an apostrophe so a note can never
run as a spreadsheet formula.

Source links point to third-party references. Wiktionary text is CC BY-SA 4.0; other sources are
linked, not reproduced.
