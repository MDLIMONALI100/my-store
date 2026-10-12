// Server-side fetch helper: talks straight to the Express API.
// Pass { revalidate: seconds } for data that can be a little stale (menus, settings);
// by default nothing is cached, so shoppers always see current stock and prices.
const API_ORIGIN = process.env.API_URL || "http://localhost:8788";

export async function serverApi(path, { revalidate } = {}) {
  // On Cloudflare the worker entry (worker/index.js) provides a direct connection to the API
  // worker; locally we fall back to plain HTTP.
  const direct = globalThis.__SW_API;
  const res = direct
    ? await direct.fetch(new Request(`https://api.internal${path}`, { headers: { "x-forwarded-proto": "https" } }))
    : await fetch(`${API_ORIGIN}${path}`, revalidate ? { next: { revalidate } } : { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Browser-side fetch helper (used by client components). Goes through the
// /api proxy in next.config.mjs, so cookies (sign-in) work.
export async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const postJson = (path, body, method = "POST") =>
  api(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
