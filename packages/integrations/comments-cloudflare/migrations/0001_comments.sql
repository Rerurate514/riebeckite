CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_url TEXT,
  author_avatar_url TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  url TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_content ON comments (content_id, created_at);
