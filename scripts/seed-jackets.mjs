// Adds the leather jacket catalog through the admin API and hides products
// from other categories. Safe to run twice: products that already exist (by
// name) are skipped.
//
// Usage:
//   ADMIN_PASSWORD=... node scripts/seed-jackets.mjs http://localhost:8787
import { readFile } from "node:fs/promises";

const BASE = (process.argv[2] || "http://localhost:8787").replace(/\/$/, "");
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!PASSWORD) {
  console.error("Set ADMIN_PASSWORD first.");
  process.exit(1);
}
const AUTH = "Basic " + Buffer.from(`admin:${PASSWORD}`).toString("base64");
const CATEGORIES = ["Biker", "Bomber", "Café Racer", "Suede"];
const FULL = "XS, S, M, L, XL, XXL";
const MENS = "S, M, L, XL, XXL";
const WOMENS = "XS, S, M, L, XL";

// price in cents; photo = file in seed/jackets/
const JACKETS = [
  { name: "Midnight Asymmetric Biker", category: "Biker", price: 28900, stock: 24, sizes: FULL, photo: "1551028719-00167b16eac5",
    description: "Our signature biker in buttery black lambskin. Asymmetric front zip, notched lapels, zip cuffs and a belted hem. The one jacket every wardrobe needs." },
  { name: "Onyx Classic Moto", category: "Biker", price: 31900, stock: 18, sizes: MENS, photo: "1727515546577-f7d82a47b51d",
    description: "Heavyweight cowhide moto with silver hardware, snap-down lapels and a quilted lining. Stiff on day one, perfectly broken in by month three." },
  { name: "Shadow Rider", category: "Biker", price: 26900, stock: 15, sizes: MENS, photo: "1727515192207-3dc860bfd773",
    description: "Slim-cut rider jacket in matte black leather with a clean zip front and minimal hardware. Sharp enough for nights out." },
  { name: "Noir Fitted Moto (Women's)", category: "Biker", price: 27900, stock: 14, sizes: WOMENS, photo: "1602370463198-086436840055",
    description: "A close, cropped fit in soft black leather with an asymmetric zip and quilted shoulders." },
  { name: "Rebel Distressed Biker", category: "Biker", price: 29900, stock: 4, sizes: "S, M, L, XL", photo: "1521223890158-f9f7c3d5d504",
    description: "Hand-finished distressing gives this biker a lived-in look from day one. Heavy zips, belted waist and lapel snaps." },
  { name: "Night Shift Biker", category: "Biker", price: 30900, stock: 20, sizes: MENS, photo: "1592158249887-ac6ae7921691",
    description: "Polished black leather with a structured shoulder and a fitted waist. Built for the stage, worn for the street." },
  { name: "Crimson Moto (Women's)", category: "Biker", price: 29900, stock: 9, sizes: WOMENS, photo: "1636730788177-faca4ef63e44",
    description: "Statement red leather moto with tonal hardware. Pair it with all black and let it do the talking." },
  { name: "Cropped Street Leather (Women's)", category: "Biker", price: 25900, stock: 0, sizes: "XS, S, M, L", photo: "1511280303142-0051e93baeeb",
    description: "Boxy, cropped and made for layering over hoodies. Soft-washed black leather with dropped shoulders." },

  { name: "Shearling Aviator Bomber", category: "Bomber", price: 45900, stock: 8, sizes: MENS, photo: "1700168077358-692db90c8b7f",
    description: "Thick brown leather shell with a full shearling lining and an oversized collar. Built for real winters." },
  { name: "Oversized Leather Bomber (Women's)", category: "Bomber", price: 28900, stock: 12, sizes: WOMENS, photo: "1777293875577-da93247013f2",
    description: "Relaxed, oversized bomber in black leather with ribbed cuffs and hem. Throw it over anything." },
  { name: "Highway Shearling Collar Jacket", category: "Bomber", price: 38900, stock: 10, sizes: MENS, photo: "1615908280461-d7a332579330",
    description: "Black leather with a shearling collar and storm cuffs. The road-trip jacket." },

  { name: "Cognac Café Racer", category: "Café Racer", price: 27900, stock: 16, sizes: MENS, photo: "1623854156816-4c4fc355ffc7",
    description: "Minimal band collar, a clean zip front and rich cognac leather that darkens beautifully with wear." },
  { name: "Burnt Umber Trucker", category: "Café Racer", price: 24900, stock: 22, sizes: MENS, photo: "1578198576866-7e0ba6078128",
    description: "Trucker cut in vintage-washed brown leather with chest flap pockets and snap buttons." },
  { name: "Chestnut Racer", category: "Café Racer", price: 29900, stock: 13, sizes: MENS, photo: "1700993443419-b6f067e734e4",
    description: "Smooth chestnut leather, snap-tab collar and zip cuffs. A café racer with clean, timeless lines." },

  { name: "Mocha Suede Overshirt", category: "Suede", price: 21900, stock: 19, sizes: MENS, photo: "1760497925596-a6462350c583",
    description: "Soft mocha suede cut like a shirt jacket, with snap closures and chest pockets. Easy layering for spring and fall." },
  { name: "Tobacco Suede Western", category: "Suede", price: 23900, stock: 11, sizes: "S, M, L, XL", photo: "1610904497162-f9faef9a8e20",
    description: "Tobacco suede with a western yoke and snap front. Gets softer every time you wear it." },
];

async function call(path, options = {}) {
  const res = await fetch(BASE + path, { ...options, headers: { Authorization: AUTH, ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${options.method || "GET"} ${path} -> ${res.status} ${data.error || ""}`);
  return data;
}

const { products } = await call("/api/admin/products");
const existing = new Set(products.map((p) => p.name));

for (const j of JACKETS) {
  if (existing.has(j.name)) {
    console.log(`skip    ${j.name} (already exists)`);
    continue;
  }
  const photo = await readFile(new URL(`../seed/jackets/${j.photo}.webp`, import.meta.url));
  const { imageId } = await call("/api/admin/images", { method: "POST", headers: { "Content-Type": "image/webp" }, body: photo });
  const { photo: _, ...fields } = j;
  await call("/api/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...fields, emoji: "🧥", color: "#1a1a1a", imageId }),
  });
  console.log(`added   ${j.name}`);
}

// Hide anything outside the jacket categories (kept in admin, off the shop).
for (const p of products) {
  if (CATEGORIES.includes(p.category) || p.hidden) continue;
  await call(`/api/admin/products/${p.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: p.name, category: p.category, price: p.price, stock: p.stock, sizes: p.sizes,
      description: p.description, emoji: p.emoji, color: p.color, imageId: p.image_id, hidden: true,
    }),
  });
  console.log(`hidden  ${p.name}`);
}
console.log("done");
