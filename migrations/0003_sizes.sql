-- Clothing sizes. products.sizes is a comma-separated list like "S,M,L,XL";
-- an empty string means the product has no size choice.
ALTER TABLE products ADD COLUMN sizes TEXT NOT NULL DEFAULT '';

-- The same product can now appear twice in one order in different sizes,
-- so size becomes part of the order_items key. SQLite can't change a
-- primary key in place, so rebuild the table.
CREATE TABLE order_items_new (
  order_id   TEXT NOT NULL REFERENCES orders (id),
  product_id TEXT NOT NULL,
  size       TEXT NOT NULL DEFAULT '',
  name       TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  qty        INTEGER NOT NULL CHECK (qty > 0),
  line_total INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id, size)
);

INSERT INTO order_items_new (order_id, product_id, size, name, unit_price, qty, line_total)
  SELECT order_id, product_id, '', name, unit_price, qty, line_total FROM order_items;

DROP TABLE order_items;
ALTER TABLE order_items_new RENAME TO order_items;
