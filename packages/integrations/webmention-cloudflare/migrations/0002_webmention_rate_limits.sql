CREATE TABLE IF NOT EXISTS webmention_rate_limits (
  bucket_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  hits INTEGER NOT NULL,
  PRIMARY KEY (bucket_key, window_start)
);
