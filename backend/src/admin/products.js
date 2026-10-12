// Admin: products, product photos and the media library.
import express, { Router } from "express";
import { db, httpError, isHex, isImageId, NOW_SQL, parseJson, parseSizes, str, uniqueSlug, slugify } from "../lib/util.js";
import { listProducts } from "../lib/products.js";

const router = Router();

// ---------- Media library ----------

const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"];
const MAX_IMAGE_BYTES = 1_500_000; // D1 rows max out at 2 MB

router.post("/images", express.raw({ type: IMAGE_TYPES, limit: "1.6mb" }), async (req, res) => {
  const type = (req.get("Content-Type") || "").split(";")[0].trim();
  if (!IMAGE_TYPES.includes(type)) throw httpError(415, "Images must be WebP, JPEG or PNG");
  const data = req.body;
  if (!Buffer.isBuffer(data) || data.length === 0) throw httpError(400, "Empty image");
  if (data.length > MAX_IMAGE_BYTES) throw httpError(413, "Image is too large (max 1.5 MB after resizing)");

  const id = crypto.randomUUID().replace(/-/g, "");
  const bytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  await db().prepare(`INSERT INTO images (id, content_type, size, data) VALUES (?, ?, ?, ?)`).bind(id, type, data.length, bytes).run();
  res.status(201).json({ imageId: id, url: `/images/${id}` });
});

router.get("/images", async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 60, 200);
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
  const [list, count] = await db().batch([
    db().prepare(`SELECT id, content_type, size, created_at FROM images ORDER BY created_at DESC, id LIMIT ? OFFSET ?`).bind(limit, offset),
    db().prepare(`SELECT COUNT(*) AS n FROM images`),
  ]);
  res.json({ images: list.results.map((i) => ({ ...i, url: `/images/${i.id}` })), total: count.results[0].n });
});

// Photos can be shared by many products and pages, so they are only deleted when nothing uses them.
router.delete("/images/:id", async (req, res) => {
  const id = req.params.id;
  if (!isImageId(id)) throw httpError(400, "Invalid image");
  const url = `%/images/${id}%`;
  const used = await db()
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM products WHERE image_id = ?1) +
         (SELECT COUNT(*) FROM product_images WHERE image_id = ?1) +
         (SELECT COUNT(*) FROM categories WHERE image_id = ?1) +
         (SELECT COUNT(*) FROM outfits WHERE image_id = ?1) +
         (SELECT COUNT(*) FROM home_sections WHERE data LIKE ?2) +
         (SELECT COUNT(*) FROM pages WHERE content LIKE ?2) +
         (SELECT COUNT(*) FROM settings WHERE value LIKE ?2) AS n`
    )
    .bind(id, url)
    .first();
  if (used.n > 0) throw httpError(409, "This photo is still used on the site. Replace it there first.");
  await db().prepare(`DELETE FROM images WHERE id = ?`).bind(id).run();
  res.json({ deleted: id });
});

// ---------- Products ----------

const COLUMNS = [
  "name", "category", "price", "compare_at_price", "emoji", "color", "description", "stock", "image_id", "sizes",
  "hidden", "featured", "is_new", "badge", "color_name", "color_hex", "style_group", "details", "materials", "fit",
  "shipping_info", "features",
];

// Checks one product from the admin form and returns clean values, or throws a 400.
async function validateProduct(input) {
  const name = str(input, "name", 100);
  const category = str(input, "category", 50);
  const price = Number(input?.price);
  const stock = Number(input?.stock);
  const compareRaw = input?.compare_at_price === "" || input?.compare_at_price == null ? null : Number(input.compare_at_price);
  const imageId = input?.imageId ? String(input.imageId) : null;
  const gallery = (Array.isArray(input?.gallery) ? input.gallery : []).map(String).slice(0, 12);
  const colorHex = str(input, "color_hex", 7);
  const features = (Array.isArray(input?.features) ? input.features : [])
    .map((f) => (typeof f === "string" ? f.trim().slice(0, 140) : ""))
    .filter(Boolean)
    .slice(0, 12);

  if (name.length < 2) throw httpError(400, "Name must be at least 2 characters");
  if (!category) throw httpError(400, "Please choose a category");
  if (!Number.isInteger(price) || price < 0 || price > 100_000_000) throw httpError(400, "Please enter a valid price");
  if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) throw httpError(400, "Stock must be a whole number, 0 or more");
  if (compareRaw !== null && (!Number.isInteger(compareRaw) || compareRaw < 0)) throw httpError(400, "Please enter a valid old price");
  if (colorHex && !isHex(colorHex)) throw httpError(400, "Colour must look like #aabbcc");

  const imageIds = [...new Set([...(imageId ? [imageId] : []), ...gallery])];
  if (imageIds.some((i) => !isImageId(i))) throw httpError(400, "Invalid image");
  if (imageIds.length) {
    const { results } = await db().prepare(`SELECT id FROM images WHERE id IN (${imageIds.map(() => "?").join(",")})`).bind(...imageIds).all();
    if (results.length !== imageIds.length) throw httpError(400, "A photo was not found. Please upload it again.");
  }

  return {
    values: {
      name,
      category,
      price,
      compare_at_price: compareRaw !== null && compareRaw > price ? compareRaw : null,
      emoji: str(input, "emoji", 16) || "🛍️",
      color: isHex(input?.color) ? input.color : "#eef0f4",
      description: str(input, "description", 2000),
      stock,
      image_id: imageId,
      sizes: parseSizes(typeof input?.sizes === "string" ? input.sizes : "").map((x) => x.slice(0, 12)).slice(0, 20).join(","),
      hidden: input?.hidden ? 1 : 0,
      featured: input?.featured ? 1 : 0,
      is_new: input?.is_new ? 1 : 0,
      badge: str(input, "badge", 30),
      color_name: str(input, "color_name", 40),
      color_hex: colorHex,
      style_group: slugify(str(input, "style_group", 60), "").slice(0, 60),
      details: str(input, "details", 3000),
      materials: str(input, "materials", 3000),
      fit: str(input, "fit", 3000),
      shipping_info: str(input, "shipping_info", 3000),
      features: JSON.stringify(features),
    },
    gallery: gallery.filter((g) => g !== imageId),
  };
}

const bindValues = (v) => COLUMNS.map((c) => v[c]);

function galleryStatements(id, gallery) {
  return [
    db().prepare(`DELETE FROM product_images WHERE product_id = ?`).bind(id),
    ...gallery.map((imageId, i) => db().prepare(`INSERT INTO product_images (product_id, image_id, sort_order) VALUES (?, ?, ?)`).bind(id, imageId, i)),
  ];
}

async function getAdminProduct(id) {
  const [p, g] = await db().batch([
    db().prepare(`SELECT *, CASE WHEN image_id IS NULL THEN NULL ELSE '/images/' || image_id END AS image_url FROM products WHERE id = ?`).bind(id),
    db().prepare(`SELECT image_id FROM product_images WHERE product_id = ? ORDER BY sort_order`).bind(id),
  ]);
  const product = p.results[0];
  if (!product) return null;
  return {
    ...product,
    features: parseJson(product.features, []),
    gallery: g.results.map((r) => ({ id: r.image_id, url: `/images/${r.image_id}` })),
  };
}

router.get("/products", async (req, res) => {
  res.json(await listProducts(req.query, { admin: true }));
});

router.post("/products", async (req, res) => {
  const { values, gallery } = await validateProduct(req.body);
  const id = await uniqueSlug("products", values.name, "product");
  await db().batch([
    db()
      .prepare(
        `INSERT INTO products (id, ${COLUMNS.join(", ")}, sort_order, updated_at)
         VALUES (?, ${COLUMNS.map(() => "?").join(", ")}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM products), ${NOW_SQL})`
      )
      .bind(id, ...bindValues(values)),
    ...galleryStatements(id, gallery),
  ]);
  res.status(201).json({ product: await getAdminProduct(id) });
});

// Create or update many products at once (the catalog seed script uses this).
// Each product may carry its own "id"; an existing id is updated, not duplicated.
router.post("/products/import", async (req, res) => {
  const list = Array.isArray(req.body?.products) ? req.body.products : [];
  if (!list.length || list.length > 40) throw httpError(400, "Send between 1 and 40 products per request");

  const statements = [];
  const ids = [];
  const used = new Set();
  for (const input of list) {
    const { values, gallery } = await validateProduct(input);
    let id = typeof input.id === "string" && /^[a-z0-9-]{2,80}$/.test(input.id) ? input.id : slugify(values.name, "product");
    if (!input.id) {
      const base = await uniqueSlug("products", values.name, "product");
      id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    }
    used.add(id);
    ids.push(id);
    const update = [...COLUMNS.map((c) => `${c} = excluded.${c}`), `updated_at = excluded.updated_at`].join(", ");
    statements.push(
      db()
        .prepare(
          `INSERT INTO products (id, ${COLUMNS.join(", ")}, sort_order, updated_at)
           VALUES (?, ${COLUMNS.map(() => "?").join(", ")}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM products), ${NOW_SQL})
           ON CONFLICT (id) DO UPDATE SET ${update}`
        )
        .bind(id, ...bindValues(values)),
      ...galleryStatements(id, gallery)
    );
  }
  await db().batch(statements);
  res.status(201).json({ imported: ids.length, ids });
});

// Change many products at once from the product list.
router.post("/products/bulk", async (req, res) => {
  const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter((i) => typeof i === "string" && /^[a-z0-9-]{1,80}$/.test(i)).slice(0, 200);
  if (!ids.length) throw httpError(400, "Choose at least one product");
  const marks = ids.map(() => "?").join(",");
  const simple = {
    hide: "hidden = 1", show: "hidden = 0", feature: "featured = 1", unfeature: "featured = 0", new: "is_new = 1", unnew: "is_new = 0",
  };
  const action = req.body?.action;

  if (action === "delete") {
    await db().batch([
      db().prepare(`DELETE FROM product_images WHERE product_id IN (${marks})`).bind(...ids),
      db().prepare(`DELETE FROM outfit_items WHERE product_id IN (${marks})`).bind(...ids),
      db().prepare(`DELETE FROM products WHERE id IN (${marks})`).bind(...ids),
    ]);
  } else if (action === "set_category") {
    const category = str(req.body, "value", 50);
    if (!category) throw httpError(400, "Choose a category");
    await db().prepare(`UPDATE products SET category = ?, updated_at = ${NOW_SQL} WHERE id IN (${marks})`).bind(category, ...ids).run();
  } else if (simple[action]) {
    await db().prepare(`UPDATE products SET ${simple[action]}, updated_at = ${NOW_SQL} WHERE id IN (${marks})`).bind(...ids).run();
  } else throw httpError(400, "Unknown action");
  res.json({ ok: true, count: ids.length });
});

router.get("/products/:id", async (req, res) => {
  const product = await getAdminProduct(req.params.id);
  if (!product) throw httpError(404, "Product not found");
  res.json({ product });
});

router.put("/products/:id", async (req, res) => {
  const id = req.params.id;
  const exists = await db().prepare(`SELECT id FROM products WHERE id = ?`).bind(id).first();
  if (!exists) throw httpError(404, "Product not found");
  const { values, gallery } = await validateProduct(req.body);
  await db().batch([
    db()
      .prepare(`UPDATE products SET ${COLUMNS.map((c) => `${c} = ?`).join(", ")}, updated_at = ${NOW_SQL} WHERE id = ?`)
      .bind(...bindValues(values), id),
    ...galleryStatements(id, gallery),
  ]);
  res.json({ product: await getAdminProduct(id) });
});

router.delete("/products/:id", async (req, res) => {
  const id = req.params.id;
  const exists = await db().prepare(`SELECT id FROM products WHERE id = ?`).bind(id).first();
  if (!exists) throw httpError(404, "Product not found");
  // Past orders keep their own copy of the name and price, so they stay intact.
  await db().batch([
    db().prepare(`DELETE FROM product_images WHERE product_id = ?`).bind(id),
    db().prepare(`DELETE FROM outfit_items WHERE product_id = ?`).bind(id),
    db().prepare(`DELETE FROM products WHERE id = ?`).bind(id),
  ]);
  res.json({ deleted: id });
});

export default router;
