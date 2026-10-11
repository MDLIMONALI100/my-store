import { sanitize, buildCss, fontsUrl, settingsScript } from "../public/theme.js";
import { withMongo } from "./mongo.js";
import { validateReview, addReview, getProductReviews, listReviews, moderateReview } from "./reviews.js";

const SHIPPING_FLAT = 500;
const FREE_SHIPPING_OVER = 5000;
const MAX_QTY = 10;
const STATUSES = ["new", "shipped", "cancelled"];
// Which status changes the admin page may make. Cancelled is final.
const TRANSITIONS = {
  new: ["shipped", "cancelled"],
  shipped: ["new"],
  cancelled: [],
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/admin/")) {
        const denied = await requireAdmin(request, env);
        if (denied) return denied;
        if (path.startsWith("/api/admin/")) return await handleAdminApi(request, env, path);
        const res = await env.ASSETS.fetch(request);
        return withHeaders(res, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
      }

      if (path.startsWith("/images/") && request.method === "GET") return await serveImage(request, env, path);
      if (path.startsWith("/api/")) return await handlePublicApi(request, env, url, path);
    } catch (err) {
      console.error(err);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }

    const res = await env.ASSETS.fetch(request);
    if (request.method === "GET" && (res.headers.get("Content-Type") || "").includes("text/html")) {
      try {
        return applySettings(res, await getSettings(env));
      } catch (err) {
        console.error("settings", err); // never let a settings problem take the shop down
      }
    }
    return res;
  },
};

// ---------- Design settings ----------

// Settings are read on every storefront page view. A short per-instance
// cache keeps that to one tiny D1 read every few seconds at most.
let settingsCache = { value: null, at: 0 };
const SETTINGS_TTL_MS = 5000;

async function getSettings(env) {
  if (settingsCache.value && Date.now() - settingsCache.at < SETTINGS_TTL_MS) return settingsCache.value;
  const row = await env.DB.prepare(`SELECT value FROM settings WHERE key = 'site'`).first();
  let stored = null;
  try {
    stored = row ? JSON.parse(row.value) : null;
  } catch {}
  settingsCache = { value: sanitize(stored), at: Date.now() };
  return settingsCache.value;
}

// Styles the page on the server, so visitors never see the default look flash first.
function applySettings(res, site) {
  return new HTMLRewriter()
    .on("head", {
      element(el) {
        el.append(`<style id="site-settings">${buildCss(site)}</style><script>${settingsScript(site)}</script>`, { html: true });
      },
    })
    .on("link#font-link", {
      element(el) {
        el.setAttribute("href", fontsUrl(site));
      },
    })
    .on("[data-setting]", {
      element(el) {
        const key = el.getAttribute("data-setting");
        if (typeof site[key] === "string") el.setInnerContent(site[key]); // plain text, never HTML
      },
    })
    .on("[data-section]", {
      element(el) {
        if (site[el.getAttribute("data-section")] === false) el.remove();
      },
    })
    .on("title", {
      text(t) {
        if (t.text.includes("Streetwear")) t.replace(t.text.replaceAll("Streetwear", site.store_name));
      },
    })
    .transform(res);
}

// ---------- Public API ----------

async function handlePublicApi(request, env, url, path) {
  if (path === "/api/products" && request.method === "GET") {
    const category = url.searchParams.get("category");
    const stmt = category
      ? env.DB.prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE hidden = 0 AND category = ? ORDER BY sort_order`).bind(category)
      : env.DB.prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE hidden = 0 ORDER BY sort_order`);
    const { results } = await stmt.all();
    return json({ products: results });
  }

  // Reviews (stored in MongoDB)
  const reviewMatch = path.match(/^\/api\/products\/([a-z0-9-]+)\/reviews$/);
  if (reviewMatch) {
    const product = await env.DB.prepare(`SELECT id FROM products WHERE id = ? AND hidden = 0`).bind(reviewMatch[1]).first();
    if (!product) return json({ error: "Product not found" }, 404);
    if (request.method === "GET") return json(await getProductReviews(env, product.id));
    if (request.method === "POST") {
      const review = validateReview(await readJson(request));
      // Quietly accept bot submissions without saving them.
      if (review.error === "spam") return json({ ok: true, pending: true }, 201);
      if (review.error) return json({ error: review.error }, 400);
      await addReview(env, product.id, review.value);
      return json({ ok: true, pending: true }, 201);
    }
  }

  const match = path.match(/^\/api\/products\/([a-z0-9-]+)$/);
  if (match && request.method === "GET") {
    const product = await env.DB.prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE id = ? AND hidden = 0`).bind(match[1]).first();
    return product ? json({ product }) : json({ error: "Product not found" }, 404);
  }

  if (path === "/api/checkout" && request.method === "POST") {
    return checkout(request, env);
  }

  return json({ error: "Not found" }, 404);
}

const PRODUCT_COLS = `id, name, category, price, emoji, color, description, stock, sizes, rating_avg, rating_count,
  CASE WHEN image_id IS NULL THEN NULL ELSE '/images/' || image_id END AS image_url`;

// Image IDs are random and never reused (a new upload gets a new ID), so
// browsers and Cloudflare's edge can cache them forever. Edge hits skip D1.
async function serveImage(request, env, path) {
  const id = path.slice("/images/".length);
  if (!/^[a-f0-9]{32}$/.test(id)) return new Response("Not found", { status: 404 });

  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const row = await env.DB.prepare(`SELECT content_type, data FROM images WHERE id = ?`).bind(id).first();
  if (!row) return new Response("Not found", { status: 404 });

  const res = new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.content_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
  await cache.put(request, res.clone());
  return res;
}

async function checkout(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const customer = validateCustomer(body?.customer);
  if (customer.error) return json({ error: customer.error }, 400);

  // Merge duplicate lines (same product and size) and validate quantities.
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  const qtyByLine = new Map(); // "id|size" -> qty
  for (const item of rawItems) {
    const id = typeof item?.id === "string" ? item.id : "";
    const size = typeof item?.size === "string" ? item.size.trim() : "";
    const qty = Number(item?.qty);
    if (!id || !Number.isInteger(qty) || qty < 1) return json({ error: "Invalid cart item" }, 400);
    const key = `${id}|${size}`;
    qtyByLine.set(key, (qtyByLine.get(key) || 0) + qty);
  }
  if (qtyByLine.size === 0) return json({ error: "Your cart is empty" }, 400);

  // Prices always come from the database, never from the browser.
  const ids = [...new Set([...qtyByLine.keys()].map((k) => k.split("|")[0]))];
  const { results: rows } = await env.DB.prepare(
    `SELECT id, name, price, stock, sizes FROM products WHERE hidden = 0 AND id IN (${ids.map(() => "?").join(",")})`
  )
    .bind(...ids)
    .all();
  const byId = new Map(rows.map((r) => [r.id, r]));

  const lines = [];
  const qtyById = new Map(); // stock is tracked per product, across all sizes
  for (const [key, qty] of qtyByLine) {
    const [id, size] = key.split("|");
    const p = byId.get(id);
    if (!p) return json({ error: "An item in your cart is no longer available" }, 400);
    const sizes = parseSizes(p.sizes);
    if (sizes.length && !sizes.includes(size)) return json({ error: `Please choose a size for ${p.name}` }, 400);
    if (!sizes.length && size) return json({ error: `${p.name} doesn't come in sizes` }, 400);
    if (qty > MAX_QTY) return json({ error: `You can order up to ${MAX_QTY} of ${p.name}` }, 400);
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
    lines.push({ product_id: id, size, name: p.name, unit_price: p.price, qty, line_total: p.price * qty });
  }
  for (const [id, qty] of qtyById) {
    const p = byId.get(id);
    if (p.stock === 0) return json({ error: `${p.name} is sold out` }, 409);
    if (qty > p.stock) return json({ error: `Only ${p.stock} ${p.name} left in stock` }, 409);
  }

  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const shipping = subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;
  const orderId = "ORD-" + crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  const c = customer.value;

  // One transaction: save the order, its items, and reduce stock.
  // If another shopper bought the last unit a moment ago, the stock CHECK fails
  // and the whole batch rolls back, so nothing is half-saved.
  const statements = [
    env.DB.prepare(
      `INSERT INTO orders (id, customer_name, email, phone, address_line1, address_line2, city, postal_code, country, subtotal, shipping, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(orderId, c.name, c.email, c.phone, c.address1, c.address2, c.city, c.postalCode, c.country, subtotal, shipping, total),
    ...lines.map((l) =>
      env.DB.prepare(
        `INSERT INTO order_items (order_id, product_id, size, name, unit_price, qty, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(orderId, l.product_id, l.size, l.name, l.unit_price, l.qty, l.line_total)
    ),
    ...[...qtyById].map(([id, qty]) => env.DB.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`).bind(qty, id)),
  ];

  try {
    await env.DB.batch(statements);
  } catch (err) {
    if (String(err?.message || err).includes("CHECK constraint")) {
      return json({ error: "Sorry, an item in your cart just sold out. Please review your cart." }, 409);
    }
    throw err;
  }

  return json({ orderId, total, email: c.email }, 201);
}

// "S, M,L ,, XL" -> ["S", "M", "L", "XL"]
function parseSizes(value) {
  return [...new Set(String(value || "").split(",").map((s) => s.trim()).filter(Boolean))];
}

function validateCustomer(input) {
  const field = (key, max) => (typeof input?.[key] === "string" ? input[key].trim().slice(0, max) : "");
  const value = {
    name: field("name", 100),
    email: field("email", 254).toLowerCase(),
    phone: field("phone", 30),
    address1: field("address1", 200),
    address2: field("address2", 200),
    city: field("city", 100),
    postalCode: field("postalCode", 20),
    country: field("country", 100),
  };

  if (value.name.length < 2) return { error: "Please enter your full name" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.email)) return { error: "Please enter a valid email address" };
  if (!/^\+?[0-9\s\-()]{6,20}$/.test(value.phone)) return { error: "Please enter a valid phone number" };
  if (value.address1.length < 3) return { error: "Please enter your street address" };
  if (!value.city) return { error: "Please enter your city" };
  if (!value.postalCode) return { error: "Please enter your postal code" };
  if (!value.country) return { error: "Please enter your country" };
  return { value };
}

// ---------- Admin ----------

// HTTP Basic Auth: the browser shows a sign-in box. Username "admin",
// password from the ADMIN_PASSWORD secret.
async function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return new Response("Admin is not set up yet. Set the ADMIN_PASSWORD secret.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const header = request.headers.get("Authorization") || "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {}
    const sep = decoded.indexOf(":");
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);
    if (sep > 0 && user === "admin" && (await safeEqual(pass, env.ADMIN_PASSWORD))) return null;
  }

  return new Response("Sign in required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="My Store Admin", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

// Hash both sides first so the comparison takes the same time whatever the input.
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

async function handleAdminApi(request, env, path) {
  // Connection check for MongoDB Atlas: GET /api/admin/mongo-health
  if (path === "/api/admin/mongo-health" && request.method === "GET") {
    const started = Date.now();
    try {
      const info = await withMongo(env, async (db) => {
        await db.command({ ping: 1 });
        const build = await db.admin().command({ buildInfo: 1 });
        const collections = await db.listCollections({}, { nameOnly: true }).toArray();
        return { database: db.databaseName, serverVersion: build.version, collections: collections.map((c) => c.name) };
      });
      return json({ ok: true, ms: Date.now() - started, ...info });
    } catch (err) {
      // Show the reason (never the connection string) so setup problems are easy to fix.
      return json({ ok: false, ms: Date.now() - started, error: String(err?.message || err).replace(/mongodb(\+srv)?:\/\/[^\s]+/g, "[connection string]") }, 502);
    }
  }

  if (path === "/api/admin/settings") {
    if (request.method === "GET") return json({ settings: await getSettings(env) });
    if (request.method === "PUT") {
      const input = await readJson(request);
      if (!input || typeof input !== "object") return json({ error: "Invalid settings" }, 400);
      const site = sanitize(input);
      await env.DB.prepare(
        `INSERT INTO settings (key, value) VALUES ('site', ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`
      )
        .bind(JSON.stringify(site))
        .run();
      settingsCache = { value: site, at: Date.now() };
      return json({ settings: site });
    }
  }

  if (path === "/api/admin/reviews" && request.method === "GET") {
    return json(await listReviews(env, new URL(request.url).searchParams.get("status")));
  }
  const reviewAdmin = path.match(/^\/api\/admin\/reviews\/([a-f0-9]{24})$/);
  if (reviewAdmin && (request.method === "PATCH" || request.method === "DELETE")) {
    const action = request.method === "DELETE" ? "delete" : (await readJson(request))?.status;
    const result = await moderateReview(env, reviewAdmin[1], action);
    if (result.error) return json({ error: result.error }, result.status);
    // Copy the new average into D1 so product lists show it instantly.
    await env.DB.prepare(`UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?`)
      .bind(result.average, result.count, result.productId)
      .run();
    return json({ ok: true, rating: { average: result.average, count: result.count } });
  }

  if (path.startsWith("/api/admin/products") || path === "/api/admin/images") {
    return handleAdminProducts(request, env, path);
  }

  if (path === "/api/admin/orders" && request.method === "GET") {
    const status = new URL(request.url).searchParams.get("status");
    const where = STATUSES.includes(status) ? "WHERE o.status = ?" : "";
    const stmt = env.DB.prepare(
      `SELECT o.id, o.created_at, o.status, o.customer_name, o.email, o.total,
              (SELECT SUM(qty) FROM order_items WHERE order_id = o.id) AS item_count
       FROM orders o ${where}
       ORDER BY o.created_at DESC
       LIMIT 500`
    );
    const { results } = await (where ? stmt.bind(status) : stmt).all();

    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    const { results: countRows } = await env.DB.prepare(`SELECT status, COUNT(*) AS n FROM orders GROUP BY status`).all();
    for (const r of countRows) counts[r.status] = r.n;

    return json({ orders: results, counts });
  }

  const match = path.match(/^\/api\/admin\/orders\/(ORD-[A-Z0-9]+)$/);
  if (match && request.method === "GET") {
    const order = await getOrder(env, match[1]);
    return order ? json({ order }) : json({ error: "Order not found" }, 404);
  }

  if (match && request.method === "PATCH") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
    const next = body?.status;
    if (!STATUSES.includes(next)) return json({ error: "Invalid status" }, 400);

    const current = await env.DB.prepare(`SELECT status FROM orders WHERE id = ?`).bind(match[1]).first();
    if (!current) return json({ error: "Order not found" }, 404);
    if (!TRANSITIONS[current.status].includes(next)) {
      return json({ error: `Can't change an order from ${current.status} to ${next}` }, 409);
    }

    const statements = [];
    if (next === "cancelled") {
      // Put the items back in stock. The status condition guards against
      // restocking twice if two cancel requests arrive together.
      statements.push(
        env.DB.prepare(
          `UPDATE products
           SET stock = stock + (SELECT SUM(qty) FROM order_items WHERE order_id = ?1 AND product_id = products.id)
           WHERE id IN (SELECT product_id FROM order_items WHERE order_id = ?1)
             AND EXISTS (SELECT 1 FROM orders WHERE id = ?1 AND status != 'cancelled')`
        ).bind(match[1])
      );
    }
    statements.push(
      env.DB.prepare(
        `UPDATE orders SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND status = ?`
      ).bind(next, match[1], current.status)
    );
    await env.DB.batch(statements);

    return json({ order: await getOrder(env, match[1]) });
  }

  return json({ error: "Not found" }, 404);
}

// ---------- Admin: products & images ----------

const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"];
const MAX_IMAGE_BYTES = 1_500_000; // D1 rows max out at 2 MB
const ADMIN_PRODUCT_COLS = `${PRODUCT_COLS}, hidden, image_id, sort_order`;

async function handleAdminProducts(request, env, path) {
  if (path === "/api/admin/images" && request.method === "POST") {
    const type = (request.headers.get("Content-Type") || "").split(";")[0].trim();
    if (!IMAGE_TYPES.includes(type)) return json({ error: "Images must be WebP, JPEG or PNG" }, 415);
    const data = await request.arrayBuffer();
    if (data.byteLength === 0) return json({ error: "Empty image" }, 400);
    if (data.byteLength > MAX_IMAGE_BYTES) return json({ error: "Image is too large (max 1.5 MB after resizing)" }, 413);

    const id = crypto.randomUUID().replace(/-/g, "");
    await env.DB.prepare(`INSERT INTO images (id, content_type, size, data) VALUES (?, ?, ?, ?)`)
      .bind(id, type, data.byteLength, data)
      .run();
    return json({ imageId: id, url: `/images/${id}` }, 201);
  }

  if (path === "/api/admin/products" && request.method === "GET") {
    const { results } = await env.DB.prepare(`SELECT ${ADMIN_PRODUCT_COLS} FROM products ORDER BY sort_order`).all();
    return json({ products: results });
  }

  if (path === "/api/admin/products" && request.method === "POST") {
    const input = await readJson(request);
    const product = await validateProduct(env, input);
    if (product.error) return json({ error: product.error }, 400);
    const p = product.value;

    const id = await uniqueSlug(env, p.name);
    await env.DB.prepare(
      `INSERT INTO products (id, name, category, price, emoji, color, description, stock, image_id, sizes, hidden, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM products), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`
    )
      .bind(id, p.name, p.category, p.price, p.emoji, p.color, p.description, p.stock, p.imageId, p.sizes, p.hidden)
      .run();
    return json({ product: await getAdminProduct(env, id) }, 201);
  }

  const match = path.match(/^\/api\/admin\/products\/([a-z0-9-]+)$/);
  if (!match) return json({ error: "Not found" }, 404);
  const id = match[1];
  const existing = await env.DB.prepare(`SELECT id, image_id FROM products WHERE id = ?`).bind(id).first();
  if (!existing) return json({ error: "Product not found" }, 404);

  if (request.method === "GET") {
    return json({ product: await getAdminProduct(env, id) });
  }

  if (request.method === "PUT") {
    const input = await readJson(request);
    const product = await validateProduct(env, input);
    if (product.error) return json({ error: product.error }, 400);
    const p = product.value;

    const statements = [
      env.DB.prepare(
        `UPDATE products SET name = ?, category = ?, price = ?, emoji = ?, color = ?, description = ?, stock = ?,
                image_id = ?, sizes = ?, hidden = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?`
      ).bind(p.name, p.category, p.price, p.emoji, p.color, p.description, p.stock, p.imageId, p.sizes, p.hidden, id),
    ];
    // Remove the old photo when it's replaced or removed.
    if (existing.image_id && existing.image_id !== p.imageId) {
      statements.push(env.DB.prepare(`DELETE FROM images WHERE id = ?`).bind(existing.image_id));
    }
    await env.DB.batch(statements);
    return json({ product: await getAdminProduct(env, id) });
  }

  if (request.method === "DELETE") {
    // Past orders keep their own copy of the name and price, so they stay intact.
    const statements = [env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id)];
    if (existing.image_id) statements.push(env.DB.prepare(`DELETE FROM images WHERE id = ?`).bind(existing.image_id));
    await env.DB.batch(statements);
    return json({ deleted: id });
  }

  return json({ error: "Not found" }, 404);
}

async function validateProduct(env, input) {
  const str = (key, max) => (typeof input?.[key] === "string" ? input[key].trim().slice(0, max) : "");
  const name = str("name", 100);
  const category = str("category", 50);
  const description = str("description", 2000);
  const emoji = str("emoji", 16) || "🛍️";
  const color = /^#[0-9a-fA-F]{6}$/.test(input?.color) ? input.color : "#eef0f4";
  const price = Number(input?.price);
  const stock = Number(input?.stock);
  const imageId = input?.imageId ? String(input.imageId) : null;
  const sizes = parseSizes(typeof input?.sizes === "string" ? input.sizes : "").map((x) => x.slice(0, 12)).slice(0, 20);

  if (name.length < 2) return { error: "Name must be at least 2 characters" };
  if (!category) return { error: "Please enter a category" };
  if (!Number.isInteger(price) || price < 0 || price > 100_000_000) return { error: "Please enter a valid price" };
  if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) return { error: "Stock must be a whole number, 0 or more" };
  if (imageId) {
    if (!/^[a-f0-9]{32}$/.test(imageId)) return { error: "Invalid image" };
    const img = await env.DB.prepare(`SELECT id FROM images WHERE id = ?`).bind(imageId).first();
    if (!img) return { error: "Image not found. Please upload it again." };
  }

  return {
    value: { name, category, description, emoji, color, price, stock, imageId, sizes: sizes.join(","), hidden: input?.hidden ? 1 : 0 },
  };
}

// "Classic Tee" -> "classic-tee", or "classic-tee-2" if that's taken.
async function uniqueSlug(env, name) {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "product";
  const { results } = await env.DB.prepare(`SELECT id FROM products WHERE id = ? OR id LIKE ?`).bind(base, `${base}-%`).all();
  const taken = new Set(results.map((r) => r.id));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

async function getAdminProduct(env, id) {
  return env.DB.prepare(`SELECT ${ADMIN_PRODUCT_COLS} FROM products WHERE id = ?`).bind(id).first();
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function getOrder(env, id) {
  const order = await env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(id).first();
  if (!order) return null;
  const { results: items } = await env.DB.prepare(
    `SELECT product_id, size, name, unit_price, qty, line_total FROM order_items WHERE order_id = ? ORDER BY name, size`
  )
    .bind(id)
    .all();
  return { ...order, items, allowed: TRANSITIONS[order.status] };
}

// ---------- Helpers ----------

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function withHeaders(res, headers) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(headers)) out.headers.set(k, v);
  return out;
}
