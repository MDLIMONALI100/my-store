-- Prices are in cents to avoid floating-point rounding.
-- The CHECK on stock makes an oversell fail the whole checkout transaction.
CREATE TABLE products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  price       INTEGER NOT NULL CHECK (price >= 0),
  emoji       TEXT NOT NULL,
  color       TEXT NOT NULL,
  description TEXT NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE orders (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'shipped', 'cancelled')),
  customer_name TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL,
  postal_code   TEXT NOT NULL,
  country       TEXT NOT NULL,
  subtotal      INTEGER NOT NULL,
  shipping      INTEGER NOT NULL,
  total         INTEGER NOT NULL
);

CREATE INDEX idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX idx_orders_status ON orders (status);

-- Name and price are copied in so old orders stay correct if the catalog changes.
CREATE TABLE order_items (
  order_id   TEXT NOT NULL REFERENCES orders (id),
  product_id TEXT NOT NULL,
  name       TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  qty        INTEGER NOT NULL CHECK (qty > 0),
  line_total INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);

INSERT INTO products (id, name, category, price, emoji, color, description, stock, sort_order) VALUES
  ('classic-tee', 'Classic Tee', 'Apparel', 2400, '👕', '#e0ecff', 'Soft 100% cotton t-shirt with a relaxed fit. Pre-shrunk and built for everyday wear.', 42, 1),
  ('everyday-hoodie', 'Everyday Hoodie', 'Apparel', 5800, '🧥', '#ffe8d6', 'Heavyweight fleece hoodie with a kangaroo pocket and brushed interior.', 18, 2),
  ('canvas-cap', 'Canvas Cap', 'Accessories', 2200, '🧢', '#e3f6e8', 'Six-panel cap in washed canvas with an adjustable strap.', 30, 3),
  ('tote-bag', 'Tote Bag', 'Accessories', 1800, '👜', '#fdf1c7', 'Sturdy organic cotton tote with an inside pocket. Holds a week of groceries.', 55, 4),
  ('ceramic-mug', 'Ceramic Mug', 'Home', 1600, '☕', '#f3e5ff', '12 oz stoneware mug with a matte glaze. Dishwasher and microwave safe.', 64, 5),
  ('desk-plant', 'Desk Plant', 'Home', 2900, '🪴', '#dff5f2', 'Low-maintenance succulent in a handmade clay pot. Thrives on a sunny desk.', 0, 6),
  ('notebook', 'Dot Grid Notebook', 'Stationery', 1400, '📓', '#ffe1e6', 'A5 notebook with 160 pages of dot grid paper and a lay-flat binding.', 80, 7),
  ('sticker-pack', 'Sticker Pack', 'Stationery', 600, '✨', '#eef0f4', 'Ten weatherproof vinyl stickers. Perfect for laptops and water bottles.', 120, 8);
