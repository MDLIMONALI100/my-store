// Plain helper functions. No browser-only code here, so both server and client
// components can use them.
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

// "Leather Jackets" -> "leather-jackets"
export const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Shop URL from a set of filters, dropping empty ones: shopUrl("boots", { size: "9", page: 2 })
export function shopUrl(category, params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "" && v !== false) q.set(k, String(v));
  const base = category ? `/shop/${category}` : "/shop";
  return q.toString() ? `${base}?${q}` : base;
}

export function isOnSale(p) {
  return p.compare_at_price != null && p.compare_at_price > p.price;
}
