// HTTP Basic Auth for /api/admin: username "admin", password from the ADMIN_PASSWORD secret.
import { getEnv } from "./util.js";

// Hash both sides first so the comparison takes the same time whatever the input.
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

export async function requireAdmin(req, res, next) {
  res.set("Cache-Control", "no-store");
  const password = getEnv().ADMIN_PASSWORD;
  if (!password) return res.status(503).json({ error: "Admin is not set up yet. Set the ADMIN_PASSWORD secret." });

  const header = req.get("Authorization") || "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {}
    const sep = decoded.indexOf(":");
    if (sep > 0 && decoded.slice(0, sep) === "admin" && (await safeEqual(decoded.slice(sep + 1), password))) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Store Admin", charset="UTF-8"');
  res.status(401).json({ error: "Sign in required" });
}
