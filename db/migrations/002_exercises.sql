-- Exercise attempts (Word Nuance and future exercise types). The word is kept as plain text because
-- a typed word need not be in the library. The generated item is stored whole, as JSON, so the
-- history can show the passage, the choices and the reasoning later.

CREATE TABLE exercise_attempt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_type TEXT NOT NULL,
  word TEXT NOT NULL,
  item TEXT NOT NULL,
  chosen_index INTEGER NOT NULL,
  correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
  model TEXT,
  flagged INTEGER NOT NULL DEFAULT 0 CHECK (flagged IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX exercise_attempt_created ON exercise_attempt (created_at);
