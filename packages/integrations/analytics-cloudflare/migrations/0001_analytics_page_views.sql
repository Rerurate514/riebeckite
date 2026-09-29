-- Apply explicitly with: wrangler d1 execute <DATABASE_NAME> --file migrations/0001_analytics_page_views.sql
-- D1 Workers cannot safely run schema migration during request handling.
CREATE TABLE IF NOT EXISTS analytics_page_views (
  content_id TEXT NOT NULL,
  bucket_start TEXT NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0 CHECK (page_views >= 0),
  PRIMARY KEY (content_id, bucket_start)
);
