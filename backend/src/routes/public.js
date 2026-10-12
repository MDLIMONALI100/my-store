// Everything customers can read or send (no sign-in needed).
import { Router } from "express";
import { db, getEnv, httpError, isEmail, parseJson, str } from "../lib/util.js";
import { PRODUCT_COLS, getProductDetail, listProducts, productFacets, productsByIds } from "../lib/products.js";
import { getSettings } from "../lib/settings.js";
import { addReview, getProductReviews, validateReview } from "../reviews.js";

const router = Router();
const imageUrl = (id) => (id ? `/images/${id}` : null);

// ---------- Products ----------

// GET /api/products?category=boots&q=chelsea&size=M&color=Black&minPrice=5000&maxPrice=20000
//                  &featured=1&new=1&sale=1&inStock=1&sort=price_asc&limit=24&offset=0
router.get("/products", async (req, res) => {
  res.json(await listProducts(req.query));
});

router.get("/products/facets", async (req, res) => {
  res.json(await productFacets(req.query));
});

// The cart asks for just the products it holds: /api/products/by-ids?ids=a,b,c
router.get("/products/by-ids", async (req, res) => {
  const ids = String(req.query.ids || "").split(",");
  res.json({ products: await productsByIds(ids) });
});

router.get("/products/:id", async (req, res) => {
  const product = await getProductDetail(req.params.id);
  if (!product) throw httpError(404, "Product not found");
  res.json({ product });
});

// Reviews live in MongoDB; the product itself must exist and be visible.
router.get("/products/:id/reviews", async (req, res) => {
  await requireVisibleProduct(req.params.id);
  res.json(await getProductReviews(getEnv(), req.params.id));
});

router.post("/products/:id/reviews", async (req, res) => {
  await requireVisibleProduct(req.params.id);
  const review = validateReview(req.body);
  // Quietly accept bot submissions without saving them.
  if (review.error === "spam") return res.status(201).json({ ok: true, pending: true });
  if (review.error) throw httpError(400, review.error);
  await addReview(getEnv(), req.params.id, review.value);
  res.status(201).json({ ok: true, pending: true });
});

async function requireVisibleProduct(id) {
  const row = await db().prepare(`SELECT id FROM products WHERE id = ? AND hidden = 0`).bind(id).first();
  if (!row) throw httpError(404, "Product not found");
}

// ---------- Categories, menus, pages ----------

router.get("/categories", async (req, res) => {
  const { results } = await db()
    .prepare(
      `SELECT c.id, c.name, c.tagline, c.description, c.image_id,
              (SELECT COUNT(*) FROM products p WHERE p.category = c.name AND p.hidden = 0) AS product_count
       FROM categories c WHERE c.hidden = 0 ORDER BY c.sort_order, c.name`
    )
    .all();
  res.json({ categories: results.map(({ image_id, ...c }) => ({ ...c, image_url: imageUrl(image_id) })) });
});

router.get("/menus", async (req, res) => {
  const { results } = await db()
    .prepare(`SELECT id, location, label, href, parent_id FROM menus WHERE hidden = 0 ORDER BY location, sort_order, id`)
    .all();
  const grouped = { header: [], footer_shop: [], footer_info: [] };
  for (const m of results) grouped[m.location]?.push(m);
  res.json({ menus: grouped });
});

router.get("/pages", async (req, res) => {
  const { results } = await db().prepare(`SELECT id, title FROM pages WHERE hidden = 0 ORDER BY title`).all();
  res.json({ pages: results });
});

router.get("/pages/:slug", async (req, res) => {
  const page = await db()
    .prepare(`SELECT id, title, subtitle, content, meta_description FROM pages WHERE id = ? AND hidden = 0`)
    .bind(req.params.slug)
    .first();
  if (!page) throw httpError(404, "Page not found");
  res.json({ page: { ...page, content: parseJson(page.content, []) } });
});

// ---------- Outfits ----------

async function loadOutfits({ id, limit = 50 } = {}) {
  const { results } = await db()
    .prepare(
      `SELECT id, name, description, image_id FROM outfits WHERE hidden = 0 ${id ? "AND id = ?" : ""} ORDER BY sort_order, name LIMIT ?`
    )
    .bind(...(id ? [id, limit] : [limit]))
    .all();
  if (!results.length) return [];
  const { results: items } = await db()
    .prepare(
      `SELECT oi.outfit_id, ${PRODUCT_COLS}
       FROM outfit_items oi JOIN products p ON p.id = oi.product_id
       WHERE p.hidden = 0 AND oi.outfit_id IN (${results.map(() => "?").join(",")})
       ORDER BY oi.sort_order`
    )
    .bind(...results.map((o) => o.id))
    .all();
  return results.map(({ image_id, ...o }) => ({
    ...o,
    image_url: imageUrl(image_id),
    items: items.filter((i) => i.outfit_id === o.id).map(({ outfit_id, ...p }) => p),
  }));
}

router.get("/outfits", async (req, res) => {
  res.json({ outfits: await loadOutfits() });
});

router.get("/outfits/:id", async (req, res) => {
  const [outfit] = await loadOutfits({ id: req.params.id });
  if (!outfit) throw httpError(404, "Outfit not found");
  res.json({ outfit });
});

// ---------- Home page ----------
// The home page is a list of sections; sections that show products or categories
// arrive with that data already filled in, so the page needs just one request.

router.get("/home", async (req, res) => {
  const { results } = await db().prepare(`SELECT id, type, data FROM home_sections WHERE hidden = 0 ORDER BY sort_order, id`).all();
  const sections = await Promise.all(
    results.map(async (s) => {
      const data = parseJson(s.data, {});
      try {
        if (s.type === "product_rail") data.products = await railProducts(data);
        if (s.type === "categories") data.items = await homeCategories();
        if (s.type === "outfits") data.items = await loadOutfits({ limit: Math.min(Number(data.limit) || 4, 12) });
        if (s.type === "viewer360") {
          data.viewer = await getSettings("viewer");
          data.outfits = await loadOutfits({ limit: 8 }); // the viewer lets shoppers switch between looks
        }
      } catch (err) {
        console.error("home section", s.type, err);
        data.error = true; // one broken section never takes the whole page down
      }
      return { id: s.id, type: s.type, data };
    })
  );
  res.json({ sections });
});

async function homeCategories() {
  const { results } = await db()
    .prepare(`SELECT id, name, tagline, image_id FROM categories WHERE hidden = 0 ORDER BY sort_order, name`)
    .all();
  return results.map(({ image_id, ...c }) => ({ ...c, image_url: imageUrl(image_id) }));
}

async function railProducts(data) {
  const limit = Math.min(Math.max(Number(data.limit) || 8, 1), 24);
  if (data.source === "manual" && Array.isArray(data.ids)) {
    const found = await productsByIds(data.ids.map(String));
    const order = new Map(data.ids.map((id, i) => [String(id), i]));
    return found.sort((a, b) => order.get(a.id) - order.get(b.id)).slice(0, limit);
  }
  const query = { limit, sort: "featured" };
  if (data.source === "featured") query.featured = "1";
  if (data.source === "new") (query.new = "1"), (query.sort = "newest");
  if (data.source === "sale") query.sale = "1";
  if (data.source === "category") query.category = String(data.category || "");
  return (await listProducts(query)).products;
}

// ---------- Settings (public part) ----------

router.get("/settings", async (req, res) => {
  const [storefront, theme, viewer] = await Promise.all([getSettings("storefront"), getSettings("theme"), getSettings("viewer")]);
  res.json({ storefront, theme, viewer });
});

// ---------- Newsletter and contact ----------

router.post("/newsletter", async (req, res) => {
  if (str(req.body, "website", 200)) return res.status(201).json({ ok: true }); // honeypot: bots fill the hidden field
  const email = str(req.body, "email", 254).toLowerCase();
  if (!isEmail(email)) throw httpError(400, "Please enter a valid email address");
  await db().prepare(`INSERT OR IGNORE INTO subscribers (email) VALUES (?)`).bind(email).run();
  res.status(201).json({ ok: true });
});

router.post("/contact", async (req, res) => {
  if (str(req.body, "website", 200)) return res.status(201).json({ ok: true });
  const name = str(req.body, "name", 100);
  const email = str(req.body, "email", 254).toLowerCase();
  const message = str(req.body, "message", 3000);
  if (name.length < 2) throw httpError(400, "Please enter your name");
  if (!isEmail(email)) throw httpError(400, "Please enter a valid email address");
  if (message.length < 10) throw httpError(400, "Please write a message (10+ characters)");
  await db().prepare(`INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)`).bind(name, email, message).run();
  res.status(201).json({ ok: true });
});

export default router;

// ---------- Images (served at /images/:id, outside /api) ----------
// Image IDs are random and never reused, so browsers and Cloudflare's edge can
// cache them forever. Edge cache hits skip the database entirely.
export async function serveImage(req, res) {
  const id = req.params.id;
  if (!/^[a-f0-9]{32}$/.test(id)) throw httpError(404, "Not found");

  const key = new Request(`https://images.cache.local/${id}`);
  const hit = await caches.default.match(key);
  const headers = { "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" };

  let type, bytes;
  if (hit) {
    type = hit.headers.get("Content-Type");
    bytes = new Uint8Array(await hit.arrayBuffer());
  } else {
    const row = await db().prepare(`SELECT content_type, data FROM images WHERE id = ?`).bind(id).first();
    if (!row) throw httpError(404, "Not found");
    type = row.content_type;
    bytes = new Uint8Array(row.data);
    await caches.default.put(key, new Response(bytes, { headers: { "Content-Type": type, ...headers } }));
  }
  res.set({ "Content-Type": type, ...headers }).send(Buffer.from(bytes));
}
