// Customer accounts: password hashing and sign-in sessions.
import { db, httpError, isEmail } from "./util.js";

const ITERATIONS = 100_000; // the most Cloudflare Workers allow for PBKDF2
const SESSION_DAYS = 30;
export const COOKIE = "sw_session";

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
}

// "pbkdf2$100000$<salt hex>$<hash hex>"
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iterations, salt, hash] = String(stored).split("$");
  if (scheme !== "pbkdf2") return false;
  const actual = await derive(password, fromHex(salt), Number(iterations));
  return crypto.subtle.timingSafeEqual(actual, fromHex(hash).buffer);
}

const sha256 = async (text) => toHex(await crypto.subtle.digest("SHA-256", enc.encode(text)));

export function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) throw httpError(400, "Password must be at least 8 characters");
  if (password.length > 200) throw httpError(400, "Password is too long");
}

export function validateEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
  if (!isEmail(email)) throw httpError(400, "Please enter a valid email address");
  return email;
}

// ---------- sessions ----------

export async function startSession(req, res, customerId) {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db()
    .prepare(`INSERT INTO sessions (token_hash, customer_id, expires_at) VALUES (?, ?, ?)`)
    .bind(await sha256(token), customerId, expires.toISOString())
    .run();
  // Secure cookies only work over https; local development uses plain http.
  const secure = (req.get("x-forwarded-proto") || req.protocol) === "https";
  res.append("Set-Cookie", `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`);
}

function readCookie(req) {
  const match = (req.get("cookie") || "").match(new RegExp(`(?:^|; )${COOKIE}=([a-f0-9]{64})`));
  return match ? match[1] : null;
}

export async function endSession(req, res) {
  const token = readCookie(req);
  if (token) await db().prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(await sha256(token)).run();
  res.append("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export const CUSTOMER_COLS = "id, email, name, phone, address_line1, address_line2, city, postal_code, country, created_at";

// The signed-in customer for this request, or null.
export async function getCustomer(req) {
  const token = readCookie(req);
  if (!token) return null;
  return db()
    .prepare(
      `SELECT ${CUSTOMER_COLS.split(", ").map((c) => `c.${c}`).join(", ")} FROM sessions s JOIN customers c ON c.id = s.customer_id
       WHERE s.token_hash = ? AND s.expires_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`
    )
    .bind(await sha256(token))
    .first();
}

export async function requireCustomer(req, res, next) {
  const customer = await getCustomer(req);
  if (!customer) return res.status(401).json({ error: "Please sign in" });
  req.customer = customer;
  next();
}
