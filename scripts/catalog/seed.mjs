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

// ---------- 3. outfits ----------
// Six ready-made looks: one jacket, one pair of jeans and one pair of boots that go together.
const find = (category, name, color) =>
  products.find((p) => p.category === category && p.stock > 0 && !/women/i.test(p.name) && name.test(p.name) && color.test(p.color_name))?.id;
const LOOKS = [
  ["Midnight Rider", "All black, all attitude. A biker jacket, slim black denim and combat boots.", [["Leather Jackets", /biker|moto|rider/i, /black/i], ["Denim Jeans", /slim/i, /black/i], ["Boots", /combat/i, /black/i]]],
  ["Cognac Classic", "Warm cognac leather over dark indigo denim and polished brown boots.", [["Leather Jackets", /racer/i, /cognac/i], ["Denim Jeans", /straight/i, /indigo|navy|dark/i], ["Boots", /chelsea/i, /cognac|chestnut|brown/i]]],
  ["City Chelsea", "Easy city style: a black biker, mid-wash straight jeans and black Chelsea boots.", [["Leather Jackets", /biker/i, /black/i], ["Denim Jeans", /straight/i, /mid|blue/i], ["Boots", /chelsea/i, /black/i]]],
  ["Western Weekend", "Brown leather, faded blue denim and cowboy boots for the weekend.", [["Leather Jackets", /trucker|utility|racer/i, /brown|cognac/i], ["Denim Jeans", /straight|relaxed/i, /faded|light|blue/i], ["Boots", /cowboy|western/i, /cognac|tan|brown/i]]],
  ["Raw Edge", "Selvedge indigo, a distressed black biker and heavy engineer boots.", [["Leather Jackets", /distressed|biker/i, /black/i], ["Denim Jeans", /selvedge/i, /indigo/i], ["Boots", /engineer/i, /black/i]]],
  ["Desert Drifter", "Soft suede and sandy tones: a suede jacket, light wash jeans and tan boots.", [["Leather Jackets", /suede/i, /./], ["Denim Jeans", /relaxed|straight/i, /light|sky/i], ["Boots", /./, /tan|wheat|honey|sand/i]]],
];
const { items: existingOutfits } = await call("/api/admin/outfits");
for (const [name, description, parts] of LOOKS) {
  const ids = parts.map(([c, n, col]) => find(c, n, col)).filter(Boolean);
  if (ids.length < 3) {
    console.log(`  outfit skipped (not enough matching products): ${name}`);
    continue;
  }
  const have = existingOutfits.find((o) => o.name === name);
  const outfit = have || (await call("/api/admin/outfits", json("POST", { name, description }))).item;
  await call(`/api/admin/outfits/${outfit.id}/products`, json("PUT", { ids }));
  console.log(`  outfit: ${name} (${ids.length} pieces)`);
}

// ---------- 4. category pictures ----------
const slugOf = { "Leather Jackets": "leather-jackets", "Denim Jeans": "denim-jeans", Boots: "boots" };
for (const [cat, file] of Object.entries(categoryFiles)) {
  await call(`/api/admin/categories/${slugOf[cat]}`, json("PUT", { image_id: uploaded[file] }));
}
const { total } = await call("/api/products?limit=1");
console.log(`done. ${total} products are live in the shop.`);
