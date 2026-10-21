-- Initial schema. Uniqueness rules live here, not only in application code.

CREATE TABLE word (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  normalized_headword TEXT NOT NULL UNIQUE,
  display_headword TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  pos TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 2,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'rejected')),
  confidence TEXT NOT NULL CHECK (confidence IN ('sourced', 'uncertain')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- All human-readable card content as one JSON document (validated by the content linter).
CREATE TABLE word_content (
  word_id INTEGER PRIMARY KEY REFERENCES word(id) ON DELETE CASCADE,
  data TEXT NOT NULL
);

CREATE TABLE word_source (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL REFERENCES word(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  field TEXT NOT NULL DEFAULT 'general',
  license TEXT,
  attribution TEXT,
  retrieved_at TEXT
);

CREATE TABLE daily_set (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_date TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE daily_set_word (
  set_id INTEGER NOT NULL REFERENCES daily_set(id) ON DELETE CASCADE,
  word_id INTEGER NOT NULL REFERENCES word(id),
  display_order INTEGER NOT NULL,
  UNIQUE (set_id, word_id),
  UNIQUE (set_id, display_order)
);

-- A word can be featured as "new" exactly once, ever. Reviews never write here.
CREATE TABLE featured_ledger (
  word_id INTEGER PRIMARY KEY REFERENCES word(id),
  first_featured_date TEXT NOT NULL
);

CREATE TABLE review_state (
  word_id INTEGER PRIMARY KEY REFERENCES word(id),
  state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'familiar', 'mastered', 'revisit')),
  step INTEGER NOT NULL DEFAULT 0,
  due_at TEXT,
  last_reviewed_at TEXT
);

CREATE TABLE review_attempt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL REFERENCES word(id),
  activity_type TEXT NOT NULL,
  result TEXT NOT NULL,
  rating TEXT CHECK (rating IN ('again', 'hard', 'good', 'easy')),
  answered_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE user_word_note (
  word_id INTEGER PRIMARY KEY REFERENCES word(id),
  note TEXT NOT NULL DEFAULT '',
  favorite INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('teaser', 'capsule', 'critical')),
  title TEXT NOT NULL,
  data TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'published'
);

CREATE TABLE activity_attempt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL REFERENCES activity(id),
  response TEXT,
  result TEXT,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE generation_run (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  status TEXT NOT NULL,
  detail TEXT
);

CREATE TABLE issue_report (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER REFERENCES word(id),
  field TEXT,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE setting (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
