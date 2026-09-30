CREATE TABLE IF NOT EXISTS webmentions (
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  type TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  published_at TEXT,
  title TEXT,
  excerpt TEXT,
  author_name TEXT,
  author_url TEXT,
  author_photo TEXT,
  PRIMARY KEY (source, target)
);

CREATE INDEX IF NOT EXISTS idx_webmentions_target ON webmentions (target);

CREATE INDEX IF NOT EXISTS idx_webmentions_verified_at
  ON webmentions (verified_at);
