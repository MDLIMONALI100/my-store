// Plain helper functions (ported from public/app.js). No browser-only code here,
// so both server and client components can use them.
import { DEFAULTS, sanitize } from "./theme";

// Until Step 5 the design settings are the defaults; later they come from the API.
export const SITE = sanitize(DEFAULTS);

export const CATEGORIES = ["Biker", "Bomber", "Café Racer", "Suede"];

export function formatPrice(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function parseSizes(value) {
  return [...new Set(String(value || "").split(",").map((s) => s.trim()).filter(Boolean))];
}

export function sizeRange(p) {
  const s = parseSizes(p.sizes);
  return s.length > 1 ? `${s[0]}–${s[s.length - 1]}` : s[0] || "";
}
