// Browser-side helpers for the admin panel. Everything talks to /api/admin/* using the
// sign-in cookie; if the session has ended the shopper-facing login page is shown.

export async function adminApi(path, options = {}) {
  const res = await fetch(`/api/admin${path}`, { credentials: "same-origin", ...options });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hard redirect so every admin screen resets
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    throw new Error("Please sign in");
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const adminJson = (path, body, method = "POST") =>
  adminApi(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Shrinks a photo in the browser to a WebP under 1.4 MB (the database limit is 2 MB per row).
export async function resizeToWebp(file, maxSide = 1600) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.85, 0.75, 0.65, 0.5, 0.4]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= 1_400_000) return blob;
  }
  throw new Error("That photo is too large even after shrinking. Try a smaller one.");
}

// Uploads a photo file and returns { imageId, url }.
export async function uploadPhoto(file) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  const blob = await resizeToWebp(file);
  return adminApi("/images", { method: "POST", headers: { "Content-Type": "image/webp" }, body: blob });
}

export const dollars = (cents) => (cents == null ? "" : (cents / 100).toFixed(2).replace(/\.00$/, ""));
export const toCents = (text) => {
  const n = Number.parseFloat(String(text).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};
