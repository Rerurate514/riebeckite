-- Apply explicitly with: wrangler d1 execute <DATABASE_NAME> --file migrations/0002_analytics_rate_limits.sql
-- D1 Workers cannot safely run schema migration during request handling.
-- The connecting IP is stored as bucket_key for the active window only.
-- D1 has no TTL; prune expired rows periodically if retention matters.
CREATE TABLE IF NOT EXISTS analytics_rate_limits (
  bucket_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0 CHECK (hits >= 0),
  PRIMARY KEY (bucket_key, window_start)
);
