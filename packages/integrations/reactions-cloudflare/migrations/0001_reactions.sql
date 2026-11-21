CREATE TABLE IF NOT EXISTS reactions (
  content_id TEXT NOT NULL,
  user_key TEXT NOT NULL,
  reaction_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (content_id, user_key, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_reactions_content ON reactions (content_id);
