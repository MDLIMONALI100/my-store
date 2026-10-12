// Server-side fetch helper: talks straight to the Express API.
const API_ORIGIN = process.env.API_URL || "http://localhost:8788";

export async function serverApi(path) {
  const res = await fetch(`${API_ORIGIN}${path}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Browser-side fetch helper (used by client components). Goes through the
// /api proxy in next.config.mjs.
export async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
