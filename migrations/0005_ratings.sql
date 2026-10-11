-- Rating summary copied from MongoDB (reviews live there) so product lists
-- can show stars without a round trip to Atlas on every page view.
-- Recalculated whenever a review is approved, hidden or deleted.
ALTER TABLE products ADD COLUMN rating_avg REAL NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;
