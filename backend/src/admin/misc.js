// Admin: MongoDB check, settings, review moderation, newsletter and messages.
import { Router } from "express";
import { db, getEnv, httpError } from "../lib/util.js";
import { SETTINGS_DEFAULTS, getSettings, saveSettings } from "../lib/settings.js";
import { withMongo } from "../mongo.js";
import { listReviews, moderateReview } from "../reviews.js";

const router = Router();

// Connection check for MongoDB Atlas: GET /api/admin/mongo-health
router.get("/mongo-health", async (req, res) => {
  const started = Date.now();
  try {
    const info = await withMongo(getEnv(), async (mdb) => {
      await mdb.command({ ping: 1 });
      const build = await mdb.admin().command({ buildInfo: 1 });
      const collections = await mdb.listCollections({}, { nameOnly: true }).toArray();
      return { database: mdb.databaseName, serverVersion: build.version, collections: collections.map((c) => c.name) };
    });
    res.json({ ok: true, ms: Date.now() - started, ...info });
  } catch (err) {
    // Show the reason (never the connection string) so setup problems are easy to fix.
    const error = String(err?.message || err).replace(/mongodb(\+srv)?:\/\/[^\s]+/g, "[connection string]");
    res.status(502).json({ ok: false, ms: Date.now() - started, error });
  }
});

// ---------- Settings ----------

router.get("/settings", async (req, res) => {
  const groups = Object.keys(SETTINGS_DEFAULTS);
  const values = await Promise.all(groups.map((g) => getSettings(g)));
  res.json({ settings: Object.fromEntries(groups.map((g, i) => [g, values[i]])), defaults: SETTINGS_DEFAULTS });
});

router.put("/settings/:group", async (req, res) => {
  if (!(req.params.group in SETTINGS_DEFAULTS)) throw httpError(404, "Unknown settings group");
  if (!req.body || typeof req.body !== "object") throw httpError(400, "Invalid settings");
  res.json({ settings: await saveSettings(req.params.group, req.body) });
});

// ---------- Reviews (stored in MongoDB) ----------

router.get("/reviews", async (req, res) => {
  res.json(await listReviews(getEnv(), req.query.status));
});

async function moderate(req, res, action) {
  const result = await moderateReview(getEnv(), req.params.id, action);
  if (result.error) throw httpError(result.status, result.error);
  // Copy the new average into D1 so product lists show it instantly.
  await db().prepare(`UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?`).bind(result.average, result.count, result.productId).run();
  res.json({ ok: true, rating: { average: result.average, count: result.count } });
}
router.patch("/reviews/:id", (req, res) => moderate(req, res, req.body?.status));
router.delete("/reviews/:id", (req, res) => moderate(req, res, "delete"));

// ---------- Newsletter and contact messages ----------

router.get("/subscribers", async (req, res) => {
  const { results } = await db().prepare(`SELECT email, created_at FROM subscribers ORDER BY created_at DESC LIMIT 2000`).all();
  res.json({ subscribers: results });
});
router.delete("/subscribers/:email", async (req, res) => {
  await db().prepare(`DELETE FROM subscribers WHERE email = ?`).bind(req.params.email.toLowerCase()).run();
  res.json({ ok: true });
});

router.get("/messages", async (req, res) => {
  const { results } = await db().prepare(`SELECT id, name, email, message, is_read, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 500`).all();
  res.json({ messages: results, unread: results.filter((m) => !m.is_read).length });
});
router.patch("/messages/:id", async (req, res) => {
  await db().prepare(`UPDATE contact_messages SET is_read = ? WHERE id = ?`).bind(req.body?.is_read ? 1 : 0, Number(req.params.id)).run();
  res.json({ ok: true });
});
router.delete("/messages/:id", async (req, res) => {
  await db().prepare(`DELETE FROM contact_messages WHERE id = ?`).bind(Number(req.params.id)).run();
  res.json({ ok: true });
});

export default router;
