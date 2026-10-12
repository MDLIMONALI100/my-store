-- Storefront v2: everything the new site shows that the admin can edit.
-- Safe to apply on top of the live database: it only adds tables and columns.

-- ---------- Categories ----------
-- products.category stays the category NAME (text), so existing code keeps working.
-- This table adds the URL slug, picture and wording for category pages and tiles.
CREATE TABLE categories (
  id          TEXT PRIMARY KEY,           -- URL slug, e.g. "leather-jackets"
  name        TEXT NOT NULL UNIQUE,       -- must match products.category
  tagline     TEXT NOT NULL DEFAULT '',   -- short line on category tiles
  description TEXT NOT NULL DEFAULT '',   -- intro text on the category page
  image_id    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  hidden      INTEGER NOT NULL DEFAULT 0
);

-- ---------- Product extras ----------
ALTER TABLE products ADD COLUMN compare_at_price INTEGER;                 -- old price, shown struck through when higher than price
ALTER TABLE products ADD COLUMN badge TEXT NOT NULL DEFAULT '';           -- e.g. "New Arrival"
ALTER TABLE products ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;      -- shown in "Best of" rails
ALTER TABLE products ADD COLUMN is_new INTEGER NOT NULL DEFAULT 0;        -- shown in "New arrivals"
ALTER TABLE products ADD COLUMN color_name TEXT NOT NULL DEFAULT '';      -- e.g. "Charcoal"
ALTER TABLE products ADD COLUMN color_hex TEXT NOT NULL DEFAULT '';       -- swatch, e.g. "#36454f"
ALTER TABLE products ADD COLUMN style_group TEXT NOT NULL DEFAULT '';     -- products with the same value are colour variants of one style
ALTER TABLE products ADD COLUMN details TEXT NOT NULL DEFAULT '';         -- product page tabs
ALTER TABLE products ADD COLUMN materials TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN fit TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN shipping_info TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN features TEXT NOT NULL DEFAULT '[]';      -- JSON list of bullet points

CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_style_group ON products (style_group);

-- Extra photos for the product page gallery (the main photo is products.image_id).
-- Photos can be shared by several products, so removing a row never deletes the photo itself.
CREATE TABLE product_images (
  product_id TEXT NOT NULL,
  image_id   TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, image_id)
);

-- ---------- Menus ----------
CREATE TABLE menus (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  location   TEXT NOT NULL CHECK (location IN ('header', 'footer_shop', 'footer_info')),
  label      TEXT NOT NULL,
  href       TEXT NOT NULL,
  parent_id  INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden     INTEGER NOT NULL DEFAULT 0
);

-- ---------- Pages (About, FAQ, ...) ----------
-- content is JSON: a list of blocks, e.g. [{"type":"text","text":"..."}, {"type":"list","items":["..."]}]
CREATE TABLE pages (
  id               TEXT PRIMARY KEY,      -- URL slug, e.g. "about"
  title            TEXT NOT NULL,
  subtitle         TEXT NOT NULL DEFAULT '',
  content          TEXT NOT NULL DEFAULT '[]',
  meta_description TEXT NOT NULL DEFAULT '',
  hidden           INTEGER NOT NULL DEFAULT 0,
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ---------- Home page sections ----------
-- The home page is a sorted list of sections; each has a type and a JSON "data" blob.
CREATE TABLE home_sections (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden     INTEGER NOT NULL DEFAULT 0,
  data       TEXT NOT NULL DEFAULT '{}'
);

-- ---------- Outfits ----------
CREATE TABLE outfits (
  id          TEXT PRIMARY KEY,           -- slug
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_id    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  hidden      INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE outfit_items (
  outfit_id  TEXT NOT NULL,
  product_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (outfit_id, product_id)
);

-- ---------- Visitor messages ----------
CREATE TABLE subscribers (
  email      TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE TABLE contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ================= Starter content (editable in the admin) =================

INSERT INTO categories (id, name, tagline, description, sort_order) VALUES
  ('leather-jackets', 'Leather Jackets', 'Built to be worn in', 'Heavyweight hides, honest hardware. Biker, bomber, café racer and suede jackets that get better with every mile.', 1),
  ('denim-jeans', 'Denim Jeans', 'Raw, washed, relaxed', 'Selvedge and stretch denim in straight, slim and relaxed cuts. Cut for the street, made to fade your way.', 2),
  ('boots', 'Boots', 'Step up your game', 'Chelsea, combat, work and cowboy boots in full-grain leather with durable soles.', 3);

INSERT INTO menus (location, label, href, sort_order) VALUES
  ('header', 'Shop All', '/shop', 1),
  ('header', 'Jackets', '/shop/leather-jackets', 2),
  ('header', 'Jeans', '/shop/denim-jeans', 3),
  ('header', 'Boots', '/shop/boots', 4),
  ('header', 'Outfits', '/outfits', 5),
  ('header', 'About', '/about', 6),
  ('footer_shop', 'All products', '/shop', 1),
  ('footer_shop', 'Leather Jackets', '/shop/leather-jackets', 2),
  ('footer_shop', 'Denim Jeans', '/shop/denim-jeans', 3),
  ('footer_shop', 'Boots', '/shop/boots', 4),
  ('footer_shop', 'Outfit ideas', '/outfits', 5),
  ('footer_info', 'About us', '/about', 1),
  ('footer_info', 'Contact', '/contact', 2),
  ('footer_info', 'Shipping & returns', '/shipping-returns', 3),
  ('footer_info', 'Size guide', '/size-guide', 4),
  ('footer_info', 'FAQ', '/faq', 5),
  ('footer_info', 'Privacy policy', '/privacy', 6),
  ('footer_info', 'Terms & conditions', '/terms', 7);

INSERT INTO pages (id, title, subtitle, content, meta_description) VALUES
  ('about', 'About us', 'Leather, denim and boots made to be worn in.',
   '[{"type":"text","text":"We make and sell three things: leather jackets, denim jeans and boots. Nothing else. That focus lets us obsess over hides, weaves and soles instead of chasing trends."},{"type":"heading","text":"Our promise"},{"type":"list","items":["Full-grain and top-grain leather, no shortcuts","Denim cut and washed to last years, not seasons","Free shipping on orders over $50","Easy returns within 15 days"]},{"type":"text","text":"This is a demo store: products, prices and photos are placeholders."}]',
   'About our leather jackets, denim jeans and boots.'),
  ('contact', 'Contact', 'Questions about an order, a fit or a product? Write to us.',
   '[{"type":"text","text":"Use the form below and our team will reply within one working day."},{"type":"contact_form"}]',
   'Contact our team.'),
  ('shipping-returns', 'Shipping & returns', 'Fast delivery, easy returns.',
   '[{"type":"heading","text":"Shipping"},{"type":"text","text":"Orders ship within 1-2 working days. Delivery takes 3-7 working days. Shipping is free over $50, otherwise a flat $5."},{"type":"heading","text":"Returns"},{"type":"text","text":"Not right? Return unworn items within 15 days for a refund or exchange."},{"type":"text","text":"No payment is taken online. We contact you after your order to arrange payment and delivery."}]',
   'Shipping times, costs and our returns policy.'),
  ('size-guide', 'Size guide', 'Find your fit.',
   '[{"type":"heading","text":"Jackets"},{"type":"text","text":"Measure your chest at the fullest point. Our jackets are cut slim: if you are between sizes, size up for layering."},{"type":"heading","text":"Jeans"},{"type":"text","text":"Measure your waist and inseam. Sizes are listed as waist x length in inches."},{"type":"heading","text":"Boots"},{"type":"text","text":"Boots run true to size in US men''s sizing. Half sizes are available on most styles."}]',
   'How to choose your size for jackets, jeans and boots.'),
  ('faq', 'FAQ', 'Quick answers.',
   '[{"type":"faq","items":[{"q":"Do you take payment online?","a":"Not yet. Place your order and we will contact you to arrange payment and delivery."},{"q":"How long does delivery take?","a":"3-7 working days after dispatch."},{"q":"Can I return an item?","a":"Yes, unworn items can be returned within 15 days."},{"q":"How do I care for leather?","a":"Wipe with a damp cloth and condition once or twice a year. Keep away from direct heat."}]}]',
   'Frequently asked questions.'),
  ('privacy', 'Privacy policy', '',
   '[{"type":"text","text":"We only collect the details you give us when you order, contact us or subscribe, and we use them only to serve you. We never sell your data. This is a demo store; replace this text with your own policy."}]',
   'Privacy policy.'),
  ('terms', 'Terms & conditions', '',
   '[{"type":"text","text":"By placing an order you agree that we will contact you to arrange payment and delivery. Prices and stock can change. This is a demo store; replace this text with your own terms."}]',
   'Terms and conditions.');

INSERT INTO home_sections (type, sort_order, data) VALUES
  ('hero', 1, '{"kicker":"Built for\nthe street.","line1":"Wear it","line2":"loud.","text":"Leather jackets, denim and boots built to be worn in.","button":{"label":"Shop now","href":"/shop"},"link":{"label":"Explore new in","href":"/shop?new=1"},"image":"/img/hero.webp","tag":"New\ncollection\n2026"}'),
  ('categories', 2, '{}'),
  ('product_rail', 3, '{"title":"Best of Streetwear","subtitle":"The pieces everyone asks about.","source":"featured","limit":8,"linkLabel":"View all","href":"/shop"}'),
  ('banner', 4, '{"eyebrow":"New season","title":"New\nvibes","text":"Discover everything new and now. Heavyweight hides, raw denim and boots with real soles.","button":{"label":"Explore collection","href":"/shop?new=1"},"image":"/img/editorial.webp","align":"left"}'),
  ('outfits', 5, '{"title":"Complete the look","subtitle":"Outfit ideas, ready to wear.","limit":4,"linkLabel":"All outfits","href":"/outfits"}'),
  ('viewer360', 6, '{"title":"See it from every side","text":"Drag to turn the outfit a full 360 degrees.","caption":"Leather jacket, raw denim and boots"}'),
  ('product_rail', 7, '{"title":"New arrivals","subtitle":"Fresh in this week.","source":"new","limit":8,"linkLabel":"View all","href":"/shop?new=1"}'),
  ('perks', 8, '{"items":[{"icon":"truck","title":"Fast delivery","text":"Quick & safe delivery"},{"icon":"box","title":"Easy returns","text":"Within 15 days"},{"icon":"badge","title":"Quality assured","text":"Best leather, best denim"},{"icon":"lock","title":"Secure checkout","text":"Your details stay private"}]}'),
  ('newsletter', 9, '{"title":"Join the list","text":"Early access to drops, outfit ideas and offers. No spam.","button":"Subscribe"}');
