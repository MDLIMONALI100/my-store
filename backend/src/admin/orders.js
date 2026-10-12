// Admin: orders.
import { Router } from "express";
import { db, httpError, NOW_SQL } from "../lib/util.js";

const router = Router();
const STATUSES = ["new", "shipped", "cancelled"];
// Which status changes are allowed. Cancelled is final.
const TRANSITIONS = { new: ["shipped", "cancelled"], shipped: ["new"], cancelled: [] };

router.get("/orders", async (req, res) => {
  const status = req.query.status;
  const where = STATUSES.includes(status) ? "WHERE o.status = ?" : "";
  const stmt = db().prepare(
    `SELECT o.id, o.created_at, o.status, o.customer_name, o.email, o.total,
            (SELECT SUM(qty) FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o ${where} ORDER BY o.created_at DESC LIMIT 500`
  );
  const [list, countRows] = await db().batch([where ? stmt.bind(status) : stmt, db().prepare(`SELECT status, COUNT(*) AS n FROM orders GROUP BY status`)]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of countRows.results) counts[r.status] = r.n;
  res.json({ orders: list.results, counts });
});

async function getOrder(id) {
  const order = await db().prepare(`SELECT * FROM orders WHERE id = ?`).bind(id).first();
  if (!order) return null;
  const { results: items } = await db()
    .prepare(`SELECT product_id, size, name, unit_price, qty, line_total FROM order_items WHERE order_id = ? ORDER BY name, size`)
    .bind(id)
    .all();
  return { ...order, items, allowed: TRANSITIONS[order.status] };
}

router.get("/orders/:id", async (req, res) => {
  const order = await getOrder(req.params.id);
  if (!order) throw httpError(404, "Order not found");
  res.json({ order });
});

router.patch("/orders/:id", async (req, res) => {
  const id = req.params.id;
  const next = req.body?.status;
  if (!STATUSES.includes(next)) throw httpError(400, "Invalid status");
  const current = await db().prepare(`SELECT status FROM orders WHERE id = ?`).bind(id).first();
  if (!current) throw httpError(404, "Order not found");
  if (!TRANSITIONS[current.status].includes(next)) throw httpError(409, `Can't change an order from ${current.status} to ${next}`);

  const statements = [];
  if (next === "cancelled") {
    // Put the items back in stock. The status condition guards against restocking twice
    // if two cancel requests arrive together.
    statements.push(
      db()
        .prepare(
          `UPDATE products
           SET stock = stock + (SELECT SUM(qty) FROM order_items WHERE order_id = ?1 AND product_id = products.id)
           WHERE id IN (SELECT product_id FROM order_items WHERE order_id = ?1)
             AND EXISTS (SELECT 1 FROM orders WHERE id = ?1 AND status != 'cancelled')`
        )
        .bind(id)
    );
  }
  statements.push(db().prepare(`UPDATE orders SET status = ?, updated_at = ${NOW_SQL} WHERE id = ? AND status = ?`).bind(next, id, current.status));
  await db().batch(statements);
  res.json({ order: await getOrder(id) });
});

export default router;
