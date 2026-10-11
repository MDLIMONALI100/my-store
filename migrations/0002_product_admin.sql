-- Product images are stored in D1 so the store runs on the free plan without R2.
-- The admin page shrinks photos to WebP before upload, keeping each row well under D1's 2 MB limit.
CREATE TABLE images (
  id           TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  size         INTEGER NOT NULL,
  data         BLOB NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

ALTER TABLE products ADD COLUMN image_id TEXT;
ALTER TABLE products ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN updated_at TEXT;
