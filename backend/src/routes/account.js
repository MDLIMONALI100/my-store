// My Account: register, sign in, profile and order history.
import { Router } from "express";
import { db, httpError, str } from "../lib/util.js";
import {
  CUSTOMER_COLS, endSession, getCustomer, hashPassword, requireCustomer, startSession, validateEmail, validatePassword, verifyPassword,
} from "../lib/customers.js";

const router = Router();
const MAX_FAILURES = 5; // wrong passwords per email in 15 minutes before we pause sign-in

router.post("/register", async (req, res) => {
  if (str(req.body, "website", 100)) return res.status(201).json({ customer: null }); // honeypot
  const name = str(req.body, "name", 100);
  const email = validateEmail(req.body?.email);
  validatePassword(req.body?.password);
  if (name.length < 2) throw httpError(400, "Please enter your name");

  const exists = await db().prepare(`SELECT id FROM customers WHERE email = ?`).bind(email).first();
  if (exists) throw httpError(409, "An account with this email already exists. Try signing in.");

  const info = await db()
    .prepare(`INSERT INTO customers (email, password_hash, name) VALUES (?, ?, ?)`)
    .bind(email, await hashPassword(req.body.password), name)
    .run();
  await startSession(req, res, info.meta.last_row_id);
  const customer = await db().prepare(`SELECT ${CUSTOMER_COLS} FROM customers WHERE id = ?`).bind(info.meta.last_row_id).first();
  res.status(201).json({ customer });
});

router.post("/login", async (req, res) => {
  const email = validateEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  const recent = await db()
    .prepare(`SELECT COUNT(*) AS n FROM login_attempts WHERE email = ? AND at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-15 minutes')`)
    .bind(email)
    .first();
  if (recent.n >= MAX_FAILURES) throw httpError(429, "Too many attempts. Please wait 15 minutes and try again.");

  const row = await db().prepare(`SELECT id, password_hash FROM customers WHERE email = ?`).bind(email).first();
  // Same work and same message whether the email exists or not.
  const ok = row ? await verifyPassword(password, row.password_hash) : (await hashPassword(password || "x"), false);
  if (!ok) {
    await db().prepare(`INSERT INTO login_attempts (email) VALUES (?)`).bind(email).run();
    throw httpError(401, "Wrong email or password");
  }
  await db().batch([
    db().prepare(`DELETE FROM login_attempts WHERE email = ?`).bind(email),
    db().prepare(`DELETE FROM sessions WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`), // tidy up old sessions
  ]);
  await startSession(req, res, row.id);
  res.json({ customer: await db().prepare(`SELECT ${CUSTOMER_COLS} FROM customers WHERE id = ?`).bind(row.id).first() });
});

router.post("/logout", async (req, res) => {
  await endSession(req, res);
  res.json({ ok: true });
});

// Not signed in is a normal answer here (not an error), so the page can just show the sign-in form.
router.get("/me", async (req, res) => {
  res.json({ customer: await getCustomer(req) });
});

router.patch("/me", requireCustomer, async (req, res) => {
  const b = req.body || {};
  const name = str(b, "name", 100);
  if (name.length < 2) throw httpError(400, "Please enter your name");
  const phone = str(b, "phone", 30);
  if (phone && !/^\+?[0-9\s\-()]{6,20}$/.test(phone)) throw httpError(400, "Please enter a valid phone number");
  await db()
    .prepare(`UPDATE customers SET name = ?, phone = ?, address_line1 = ?, address_line2 = ?, city = ?, postal_code = ?, country = ? WHERE id = ?`)
    .bind(name, phone, str(b, "address_line1", 200), str(b, "address_line2", 200), str(b, "city", 100), str(b, "postal_code", 20), str(b, "country", 100), req.customer.id)
    .run();
  res.json({ customer: await db().prepare(`SELECT ${CUSTOMER_COLS} FROM customers WHERE id = ?`).bind(req.customer.id).first() });
});

router.post("/password", requireCustomer, async (req, res) => {
  validatePassword(req.body?.newPassword);
  const row = await db().prepare(`SELECT password_hash FROM customers WHERE id = ?`).bind(req.customer.id).first();
  if (!(await verifyPassword(String(req.body?.currentPassword || ""), row.password_hash))) throw httpError(401, "Your current password is wrong");
  await db().prepare(`UPDATE customers SET password_hash = ? WHERE id = ?`).bind(await hashPassword(req.body.newPassword), req.customer.id).run();
  res.json({ ok: true });
});

// ---------- orders (only the customer's own) ----------

router.get("/orders", requireCustomer, async (req, res) => {
  const { results } = await db()
    .prepare(
      `SELECT o.id, o.created_at, o.status, o.subtotal, o.shipping, o.total,
              (SELECT SUM(qty) FROM order_items WHERE order_id = o.id) AS item_count
       FROM orders o WHERE o.customer_id = ? ORDER BY o.created_at DESC LIMIT 100`
    )
    .bind(req.customer.id)
    .all();
  res.json({ orders: results });
});

router.get("/orders/:id", requireCustomer, async (req, res) => {
  const order = await db()
    .prepare(`SELECT id, created_at, status, subtotal, shipping, total, address_line1, address_line2, city, postal_code, country FROM orders WHERE id = ? AND customer_id = ?`)
    .bind(req.params.id, req.customer.id)
    .first();
  if (!order) throw httpError(404, "Order not found");
  const { results: items } = await db()
    .prepare(
      `SELECT oi.product_id, oi.size, oi.name, oi.unit_price, oi.qty, oi.line_total,
              CASE WHEN p.image_id IS NULL THEN NULL ELSE '/images/' || p.image_id END AS image_url
       FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? ORDER BY oi.name, oi.size`
    )
    .bind(order.id)
    .all();
  res.json({ order: { ...order, items } });
});

export default router;
