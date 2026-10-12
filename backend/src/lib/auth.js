// Admin sign-in. Two ways in:
//   1. The admin panel's login page: POST /api/admin-auth/login sets a session cookie.
//   2. HTTP Basic Auth (username "admin"), handy for scripts: curl -u admin:PASSWORD ...
// Both use the ADMIN_PASSWORD secret.
import { Router } from "express";
import { db, getEnv, httpError } from "./util.js";

export const ADMIN_COOKIE = "sw_admin";
const SESSION_DAYS = 7;
const MAX_FAILURES = 5;

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (text) => toHex(await crypto.subtle.digest("SHA-256", enc.encode(text)));

// Hash both sides first so the comparison takes the same time whatever the input.
async function safeEqual(a, b) {
  const [ha, hb] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

function cookieToken(req) {
  const m = (req.get("cookie") || "").match(new RegExp(`(?:^|; )${ADMIN_COOKIE}=([a-f0-9]{64})`));
  return m ? m[1] : null;
}

async function hasAdminCookie(req) {
  const token = cookieToken(req);
  if (!token) return false;
  const row = await db()
    .prepare(`SELECT 1 AS ok FROM admin_sessions WHERE token_hash = ? AND expires_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`)
    .bind(await sha256(token))
    .first();
  return !!row;
}

async function hasBasicAuth(req, password) {
  const header = req.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = atob(header.slice(6));
  } catch {}
  const sep = decoded.indexOf(":");
  return sep > 0 && decoded.slice(0, sep) === "admin" && (await safeEqual(decoded.slice(sep + 1), password));
}

export async function requireAdmin(req, res, next) {
  res.set("Cache-Control", "no-store");
  const password = getEnv().ADMIN_PASSWORD;
  if (!password) return res.status(503).json({ error: "Admin is not set up yet. Set the ADMIN_PASSWORD secret." });
  if ((await hasAdminCookie(req)) || (await hasBasicAuth(req, password))) return next();
  // No WWW-Authenticate header on purpose: it would make the browser pop up its own sign-in box.
  res.status(401).json({ error: "Sign in required" });
}

// ---------- login page endpoints (mounted at /api/admin-auth) ----------

export const adminAuthRoutes = Router();

adminAuthRoutes.post("/login", async (req, res) => {
  const password = getEnv().ADMIN_PASSWORD;
  if (!password) throw httpError(503, "Admin is not set up yet. Set the ADMIN_PASSWORD secret.");
  const attempts = await db()
    .prepare(`SELECT COUNT(*) AS n FROM login_attempts WHERE email = 'admin' AND at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-15 minutes')`)
    .first();
  if (attempts.n >= MAX_FAILURES) throw httpError(429, "Too many attempts. Please wait 15 minutes and try again.");

  const given = typeof req.body?.password === "string" ? req.body.password : "";
  if (!(await safeEqual(given, password))) {
    await db().prepare(`INSERT INTO login_attempts (email) VALUES ('admin')`).run();
    throw httpError(401, "Wrong password");
  }

  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await db().batch([
    db().prepare(`DELETE FROM login_attempts WHERE email = 'admin'`),
    db().prepare(`DELETE FROM admin_sessions WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`),
    db().prepare(`INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)`).bind(await sha256(token), expires),
  ]);
  const secure = (req.get("x-forwarded-proto") || req.protocol) === "https";
  res.append("Set-Cookie", `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`);
  res.json({ ok: true });
});

adminAuthRoutes.post("/logout", async (req, res) => {
  const token = cookieToken(req);
  if (token) await db().prepare(`DELETE FROM admin_sessions WHERE token_hash = ?`).bind(await sha256(token)).run();
  res.append("Set-Cookie", `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.json({ ok: true });
});

// Signed out is a normal answer (not an error) so the login page can just show the form.
adminAuthRoutes.get("/me", async (req, res) => {
  res.json({ admin: await hasAdminCookie(req) });
});
