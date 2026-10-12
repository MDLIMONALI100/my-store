// Loads the built catalog (seed/catalog/out) into a store through its admin API.
// Safe to run again: pictures already uploaded are reused and products are updated in place.
//
//   ADMIN_PASSWORD=... node scripts/catalog/seed.mjs http://localhost:8788
import { readFile, writeFile } from "node:fs/promises";

const BASE = (process.argv[2] || "http://localhost:8788").replace(/\/$/, "");
if (!process.env.ADMIN_PASSWORD) {
  console.error("Set ADMIN_PASSWORD first.");
  process.exit(1);
}
const AUTH = "Basic " + Buffer.from(`admin:${process.env.ADMIN_PASSWORD}`).toString("base64");
const OUT = new URL("../../seed/catalog/out/", import.meta.url);

async function call(path, options = {}) {
  const res = await fetch(BASE + path, { ...options, headers: { Authorization: AUTH, ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${options.method || "GET"} ${path} -> ${res.status} ${data.error || ""}`);
  return data;
}
const json = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const { products, categoryFiles } = JSON.parse(await readFile(new URL("products.json", OUT)));

// ---------- 1. pictures ----------
const cacheFile = new URL(`uploaded-${new URL(BASE).host.replace(/[^a-z0-9]/gi, "_")}.json`, OUT);
let uploaded = {};
try { uploaded = JSON.parse(await readFile(cacheFile)); } catch {}

const files = [...new Set([...products.flatMap((p) => [p.imageFile, ...p.galleryFiles]), ...Object.values(categoryFiles)])];
async function ensure(file) {
  const id = uploaded[file];
  if (id) {
    const head = await fetch(`${BASE}/images/${id}`, { method: "HEAD" });
    if (head.ok) return;
  }
  const bytes = await readFile(new URL(`img/${file}`, OUT));
  const { imageId } = await call("/api/admin/images", { method: "POST", headers: { "Content-Type": "image/webp" }, body: bytes });
  uploaded[file] = imageId;
}
let done = 0;
const queue = [...files];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    await ensure(queue.shift());
    if (++done % 50 === 0) console.log(`  pictures ${done}/${files.length}`);
  }
}));
await writeFile(cacheFile, JSON.stringify(uploaded));
console.log(`pictures ready: ${files.length}`);

// ---------- 2. products ----------
// The original 16 jackets keep the price, stock, sizes and text they already have.
const { products: current } = await call("/api/admin/products?limit=200");
const byName = new Map(current.map((p) => [p.name, p]));

const records = products.map((p) => {
  const { imageFile, galleryFiles, existing, _women, ...fields } = p;
  const old = existing && byName.get(existing);
  return {
    ...fields,
    ...(old ? { price: old.price, stock: old.stock, sizes: old.sizes, description: old.description } : {}),
    imageId: uploaded[imageFile],
    gallery: galleryFiles.map((f) => uploaded[f]),
  };
});
for (let i = 0; i < records.length; i += 40) {
  const { imported } = await call("/api/admin/products/import", json("POST", { products: records.slice(i, i + 40) }));
  console.log(`  products ${Math.min(i + imported, records.length)}/${records.length}`);
}

// Anything else still visible (the old demo products) is hidden, not deleted.
const keep = new Set(products.map((p) => p.id));
const stray = (await call("/api/admin/products?limit=200&hidden=0")).products.filter((p) => !keep.has(p.id)).map((p) => p.id);
if (stray.length) {
  await call("/api/admin/products/bulk", json("POST", { ids: stray, action: "hide" }));
  console.log(`hid ${stray.length} older products`);
}

// ---------- 3. category pictures ----------
const slugOf = { "Leather Jackets": "leather-jackets", "Denim Jeans": "denim-jeans", Boots: "boots" };
for (const [cat, file] of Object.entries(categoryFiles)) {
  await call(`/api/admin/categories/${slugOf[cat]}`, json("PUT", { image_id: uploaded[file] }));
}
const { total } = await call("/api/products?limit=1");
console.log(`done. ${total} products are live in the shop.`);
