// Store-wide settings. Stored as JSON in the settings table (one row per group),
// always merged over these defaults so a missing value never breaks the site.
import { db, isHex, parseJson, NOW_SQL } from "./util.js";

export const SETTINGS_DEFAULTS = {
  // Shown in the header, footer and emails; money values are in cents.
  storefront: {
    store_name: "Streetwear",
    show_announcement: true,
    announcement: "Free shipping on orders over $50 | New arrivals every week | Easy 15-day returns",
    shipping_flat: 500,
    free_shipping_over: 5000,
    contact_email: "",
    contact_phone: "",
    instagram_url: "",
    facebook_url: "",
    tiktok_url: "",
    footer_tagline: "Leather jackets, denim and boots with attitude.",
    footer_statement: "Built to be\nworn in.",
  },
  // Colours and shape. The storefront turns these into CSS variables.
  theme: {
    color_bg: "#f3f2ee",
    color_bg_alt: "#e6e4de",
    color_surface: "#fbfaf8",
    color_text: "#111111",
    color_muted: "#6c6b66",
    color_border: "#d8d5ce",
    color_accent: "#111111",
    color_on_accent: "#ffffff",
    color_ink: "#111113",
    radius: 2,
  },
  // The 360-degree outfit viewer on the home page.
  viewer: {
    model_url: "", // uploaded 3D model (.glb), empty = built-in placeholder
    poster_url: "",
    auto_rotate: true,
  },
};

const LIMITS = { store_name: 40, announcement: 400, footer_tagline: 160, footer_statement: 80 };

// Keeps only known keys and forces each to the same type as its default.
export function sanitizeSettings(group, input) {
  const defaults = SETTINGS_DEFAULTS[group];
  const out = { ...defaults };
  if (!input || typeof input !== "object") return out;
  for (const [key, def] of Object.entries(defaults)) {
    const v = input[key];
    if (v === undefined) continue;
    if (typeof def === "boolean") out[key] = Boolean(v);
    else if (typeof def === "number") {
      const n = Math.round(Number(v));
      if (Number.isFinite(n) && n >= 0 && n <= 100_000_000) out[key] = n;
    } else if (typeof def === "string" && typeof v === "string") {
      const s = v.trim().slice(0, LIMITS[key] || 500);
      if (key.startsWith("color_")) {
        if (isHex(s)) out[key] = s;
      } else if (key.endsWith("_url")) {
        // Our own files (/images/..., /models/...) or normal web links, or empty.
        out[key] = /^(\/(?!\/)|https?:\/\/)/i.test(s) ? s : "";
      } else out[key] = s;
    }
  }
  return out;
}

// Settings are read on many requests; a few seconds of caching keeps D1 reads tiny.
const cache = new Map(); // group -> { value, at }
const TTL_MS = 5000;

export async function getSettings(group) {
  const hit = cache.get(group);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const row = await db().prepare(`SELECT value FROM settings WHERE key = ?`).bind(group).first();
  const value = sanitizeSettings(group, row ? parseJson(row.value, null) : null);
  cache.set(group, { value, at: Date.now() });
  return value;
}

export async function saveSettings(group, input) {
  const value = sanitizeSettings(group, input);
  await db()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = ${NOW_SQL}`
    )
    .bind(group, JSON.stringify(value))
    .run();
  cache.set(group, { value, at: Date.now() });
  return value;
}
