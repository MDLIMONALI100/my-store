// Placing an order. The server recalculates everything: prices and stock always
// come from the database, never from the browser.
import { Router } from "express";
import { db, httpError, isEmail, parseSizes } from "../lib/util.js";
import { getSettings } from "../lib/settings.js";

const MAX_QTY = 10;
const router = Router();

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
  if (value.name.length < 2) throw httpError(400, "Please enter your full name");
  if (!isEmail(value.email)) throw httpError(400, "Please enter a valid email address");
  if (!/^\+?[0-9\s\-()]{6,20}$/.test(value.phone)) throw httpError(400, "Please enter a valid phone number");
  if (value.address1.length < 3) throw httpError(400, "Please enter your street address");
  if (!value.city) throw httpError(400, "Please enter your city");
  if (!value.postalCode) throw httpError(400, "Please enter your postal code");
  if (!value.country) throw httpError(400, "Please enter your country");
  return value;
}

router.post("/checkout", async (req, res) => {
  const c = validateCustomer(req.body?.customer);

  // Merge duplicate lines (same product and size) and validate quantities.
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const qtyByLine = new Map(); // "id|size" -> qty
  for (const item of rawItems) {
    const id = typeof item?.id === "string" ? item.id : "";
    const size = typeof item?.size === "string" ? item.size.trim() : "";
    const qty = Number(item?.qty);
    if (!id || !Number.isInteger(qty) || qty < 1) throw httpError(400, "Invalid cart item");
    const key = `${id}|${size}`;
    qtyByLine.set(key, (qtyByLine.get(key) || 0) + qty);
  }
  if (qtyByLine.size === 0) throw httpError(400, "Your cart is empty");
  if (qtyByLine.size > 50) throw httpError(400, "Too many items in one order");

  const ids = [...new Set([...qtyByLine.keys()].map((k) => k.split("|")[0]))];
  const { results: rows } = await db()
    .prepare(`SELECT id, name, price, stock, sizes FROM products WHERE hidden = 0 AND id IN (${ids.map(() => "?").join(",")})`)
    .bind(...ids)
    .all();
  const byId = new Map(rows.map((r) => [r.id, r]));

  const lines = [];
  const qtyById = new Map(); // stock is tracked per product, across all sizes
  for (const [key, qty] of qtyByLine) {
    const [id, size] = key.split("|");
    const p = byId.get(id);
    if (!p) throw httpError(400, "An item in your cart is no longer available");
    const sizes = parseSizes(p.sizes);
    if (sizes.length && !sizes.includes(size)) throw httpError(400, `Please choose a size for ${p.name}`);
    if (!sizes.length && size) throw httpError(400, `${p.name} doesn't come in sizes`);
    if (qty > MAX_QTY) throw httpError(400, `You can order up to ${MAX_QTY} of ${p.name}`);
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
    lines.push({ product_id: id, size, name: p.name, unit_price: p.price, qty, line_total: p.price * qty });
  }
  for (const [id, qty] of qtyById) {
    const p = byId.get(id);
    if (p.stock === 0) throw httpError(409, `${p.name} is sold out`);
    if (qty > p.stock) throw httpError(409, `Only ${p.stock} ${p.name} left in stock`);
  }

  // Shipping rules are editable in the admin (Settings > Store).
  const { shipping_flat, free_shipping_over } = await getSettings("storefront");
  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const shipping = subtotal >= free_shipping_over ? 0 : shipping_flat;
  const total = subtotal + shipping;
  const orderId = "ORD-" + crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();

  // One transaction: save the order, its items, and reduce stock. If another shopper
  // bought the last unit a moment ago, the stock CHECK fails and everything rolls back.
  const statements = [
    db()
      .prepare(
        `INSERT INTO orders (id, customer_name, email, phone, address_line1, address_line2, city, postal_code, country, subtotal, shipping, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(orderId, c.name, c.email, c.phone, c.address1, c.address2, c.city, c.postalCode, c.country, subtotal, shipping, total),
    ...lines.map((l) =>
      db()
        .prepare(`INSERT INTO order_items (order_id, product_id, size, name, unit_price, qty, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(orderId, l.product_id, l.size, l.name, l.unit_price, l.qty, l.line_total)
    ),
    ...[...qtyById].map(([id, qty]) => db().prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`).bind(qty, id)),
  ];

  try {
    await db().batch(statements);
  } catch (err) {
    if (String(err?.message || err).includes("CHECK constraint")) {
      throw httpError(409, "Sorry, an item in your cart just sold out. Please review your cart.");
    }
    throw err;
  }

  res.status(201).json({ orderId, subtotal, shipping, total, email: c.email });
});

export default router;
