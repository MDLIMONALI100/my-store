// Small helpers shared by every route.
import { env } from "cloudflare:workers";

export const db = () => env.DB;
export const getEnv = () => env;
export const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

// An error that carries the HTTP status to send back. Throw it from any route.
export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Reads a trimmed, length-limited string field from a request body.
export const str = (input, key, max) => (typeof input?.[key] === "string" ? input[key].trim().slice(0, max) : "");

// "S, M,L ,, XL" -> ["S", "M", "L", "XL"]
export function parseSizes(value) {
  return [...new Set(String(value || "").split(",").map((s) => s.trim()).filter(Boolean))];
}

export function slugify(text, fallback = "item") {
  return (
    String(text)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || fallback
  );
}

// "Classic Tee" -> "classic-tee", or "classic-tee-2" if that's taken.
// Only tables listed here may be used (the name goes into SQL).
const SLUG_TABLES = ["products", "categories", "outfits", "pages"];
export async function uniqueSlug(table, name, fallback) {
  if (!SLUG_TABLES.includes(table)) throw new Error("bad table");
  const base = slugify(name, fallback);
  const { results } = await db().prepare(`SELECT id FROM ${table} WHERE id = ? OR id LIKE ?`).bind(base, `${base}-%`).all();
  const taken = new Set(results.map((r) => r.id));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export const isImageId = (v) => typeof v === "string" && /^[a-f0-9]{32}$/.test(v);
export const isHex = (v) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// Links an admin types in must be our own pages or normal web links, never "javascript:".
export function safeHref(value) {
  const v = typeof value === "string" ? value.trim().slice(0, 500) : "";
  return /^(\/(?!\/)|https?:\/\/|mailto:|tel:|#)/i.test(v) ? v : "";
}

// Cleans free-form JSON from the admin (home sections, page blocks): trims strings,
// caps lengths, and blanks any link-like field that isn't a safe URL.
export function cleanData(value, depth = 0) {
  if (depth > 6) return null;
  if (Array.isArray(value)) return value.slice(0, 60).map((v) => cleanData(v, depth + 1));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value).slice(0, 60)) {
      if (!/^[A-Za-z0-9_]{1,40}$/.test(k)) continue;
      out[k] = /(href|url|link)$/i.test(k) && typeof v === "string" ? safeHref(v) : cleanData(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string") return value.trim().slice(0, 4000);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  return null;
}

export function parseJson(text, fallback) {
  try {
    const v = JSON.parse(text);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

// Escapes % and _ so a search for "50%" matches the text "50%" literally.
export const likeEscape = (s) => s.replace(/[\\%_]/g, "\\$&");
