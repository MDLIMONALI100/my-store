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

      if (path.startsWith("/api/")) return await handlePublicApi(request, env, url, path);
    } catch (err) {
      console.error(err);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }

    return env.ASSETS.fetch(request);
  },
};

// ---------- Public API ----------

async function handlePublicApi(request, env, url, path) {
  if (path === "/api/products" && request.method === "GET") {
    const category = url.searchParams.get("category");
    const stmt = category
      ? env.DB.prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE category = ? ORDER BY sort_order`).bind(category)
      : env.DB.prepare(`SELECT ${PRODUCT_COLS} FROM products ORDER BY sort_order`);
    const { results } = await stmt.all();
    return json({ products: results });
  }

  const match = path.match(/^\/api\/products\/([a-z0-9-]+)$/);
  if (match && request.method === "GET") {
    const product = await env.DB.prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE id = ?`).bind(match[1]).first();
    return product ? json({ product }) : json({ error: "Product not found" }, 404);
  }

  if (path === "/api/checkout" && request.method === "POST") {
    return checkout(request, env);
  }

  return json({ error: "Not found" }, 404);
}

const PRODUCT_COLS = "id, name, category, price, emoji, color, description, stock";

async function checkout(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const customer = validateCustomer(body?.customer);
  if (customer.error) return json({ error: customer.error }, 400);

  // Merge duplicate lines and validate quantities.
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  const qtyById = new Map();
  for (const item of rawItems) {
    const id = typeof item?.id === "string" ? item.id : "";
    const qty = Number(item?.qty);
    if (!id || !Number.isInteger(qty) || qty < 1) return json({ error: "Invalid cart item" }, 400);
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
  }
  if (qtyById.size === 0) return json({ error: "Your cart is empty" }, 400);

  // Prices always come from the database, never from the browser.
  const ids = [...qtyById.keys()];
  const { results: rows } = await env.DB.prepare(
    `SELECT id, name, price, stock FROM products WHERE id IN (${ids.map(() => "?").join(",")})`
  )
    .bind(...ids)
    .all();
  const byId = new Map(rows.map((r) => [r.id, r]));

  const lines = [];
  for (const [id, qty] of qtyById) {
    const p = byId.get(id);
    if (!p) return json({ error: "An item in your cart is no longer available" }, 400);
    if (qty > MAX_QTY) return json({ error: `You can order up to ${MAX_QTY} of ${p.name}` }, 400);
    if (p.stock === 0) return json({ error: `${p.name} is sold out` }, 409);
    if (qty > p.stock) return json({ error: `Only ${p.stock} ${p.name} left in stock` }, 409);
    lines.push({ product_id: id, name: p.name, unit_price: p.price, qty, line_total: p.price * qty });
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
        `INSERT INTO order_items (order_id, product_id, name, unit_price, qty, line_total) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(orderId, l.product_id, l.name, l.unit_price, l.qty, l.line_total)
    ),
    ...lines.map((l) => env.DB.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`).bind(l.qty, l.product_id)),
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
           SET stock = stock + (SELECT qty FROM order_items WHERE order_id = ?1 AND product_id = products.id)
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

async function getOrder(env, id) {
  const order = await env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(id).first();
  if (!order) return null;
  const { results: items } = await env.DB.prepare(
    `SELECT product_id, name, unit_price, qty, line_total FROM order_items WHERE order_id = ? ORDER BY name`
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
