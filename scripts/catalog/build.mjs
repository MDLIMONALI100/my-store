// Builds the demo catalog: 200 products (70 leather jackets, 65 denim jeans, 65 boots).
//
//   node scripts/catalog/download.mjs     (once: fetch the Unsplash photos)
//   node scripts/catalog/build.mjs        (this file: crops photos + writes products.json)
//   ADMIN_PASSWORD=... node scripts/catalog/seed.mjs http://localhost:8788
//
// Everything is deterministic (seeded random), so running it again gives the same catalog.
// Each photo becomes 4 pictures (full, zoomed, off-centre, mirrored). A product's main picture is
// one of those and the other three, plus a close-up texture shot, are its gallery.
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { BOOT_PHOTOS, CATEGORY_PHOTOS, DETAIL_PHOTOS, JACKET_PHOTOS, JEANS_PHOTOS } from "./photos.mjs";

const sharp = createRequire(new URL("../../frontend/package.json", import.meta.url))("sharp");
const ROOT = new URL("../../seed/", import.meta.url).pathname;
const OUT = `${ROOT}catalog/out/`;
await mkdir(`${OUT}img`, { recursive: true });

// ---------- seeded random ----------
let seed = 20261012;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const shuffle = (arr) => arr.map((v) => [rand(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ---------- pictures ----------
const VARIANTS = ["full", "zoom", "offset", "mirror"];
const W = 800, H = 1000;
const made = new Set();
async function makePicture(photo, variant) {
  const file = `${photo.id}_${variant}.webp`;
  if (made.has(file)) return file;
  made.add(file);
  const base = await sharp(`${ROOT}${photo.src}`).rotate().resize(1000, 1250, { fit: "cover", position: sharp.strategy.attention }).toBuffer();
  let img = sharp(base);
  const crop = (l, t, f) => img.extract({ left: Math.round(1000 * l), top: Math.round(1250 * t), width: Math.round(1000 * f), height: Math.round(1250 * f) });
  if (variant === "zoom") img = crop(0.13, 0.13, 0.74);
  if (variant === "offset") img = crop(0.03, 0.04, 0.74);
  if (variant === "mirror") img = img.flop();
  await img.resize(W, H, { fit: "cover" }).webp({ quality: 80 }).toFile(`${OUT}img/${file}`);
  return file;
}

// ---------- words ----------
const STYLE_WORDS = shuffle(
  "Harlan Calder Ridge Atlas Nomad Rogue Vesper Sterling Ember Onyx Dune Cobalt Maverick Sable Drifter Cinder Hollis Riot Slate Kodiak Lennox Marlow Orion Pike Quill Rowan Stratus Talon Union Vance Wren Zephyr Ashton Bishop Cassidy Dalton Easton Flint Gage Hudson Jasper Knox Lyric Monroe Nash Oakley Prescott Reece Sawyer Thorne Vaughn Wyatt Yardley Zane Archer Bronx Cruz Dex Everett Finley Garrison Holden Ivor Jericho Kendrick Lowell Merrick Nolan Orson Pierce Quinn Remy Stellan Tobias Uriah Vito Weston Xander York Zeke Ansel Beck Corbin Dorian Emmett Fletcher Grayson Hale Isaac Jude Kit Landon Mercer Nico Otis Perry Rhett Silas Tate Wells Abel Brooks Colt Dean Eli Ford Gideon Heath Ira Jonah Knight Leo Miles Noel Owen Paxton Reed Shaw Trent".split(" ")
);
let styleIdx = 0;
const nextStyle = () => STYLE_WORDS[styleIdx++ % STYLE_WORDS.length];

const DESC = {
  "Leather Jackets": {
    biker: ["A sharp {color} {type} with an asymmetric zip front, snap-down lapels and zip cuffs. Stiff on day one, perfectly broken in by month three.", "Cut close through the body with a belted hem and notched collar. This {color} {type} is the one jacket that goes with everything.", "Heavyweight {color} leather, silver hardware and a quilted lining. Built for riding, worn everywhere."],
    racer: ["Clean lines, a minimal collar and rich {color} leather that darkens beautifully with wear.", "A {color} {type} with a slim neckline and a straight front zip. Timeless, light and made to be lived in.", "Smooth {color} leather with zip pockets and a tailored fit. The easiest leather jacket to wear every day."],
    bomber: ["Thick {color} leather with a warm lining and a relaxed shoulder. Built for real winters.", "A bold {color} {type} with a generous collar and storm cuffs. The road-trip jacket."],
    suede: ["Soft {color} suede cut like a shirt jacket, with snap closures and chest pockets. Easy layering for spring and fall.", "Brushed {color} suede with a clean front and a relaxed fit. Gets softer every time you wear it."],
  },
  "Denim Jeans": {
    straight: ["A classic straight leg in {color} denim. Mid rise, a clean silhouette and a fit that works with boots or sneakers.", "Straight from hip to hem in {color}. Sturdy denim that softens with every wear."],
    slim: ["Slim through the thigh and tapered at the ankle in {color} stretch denim. Sharp without being tight.", "A close, modern fit in {color} with just enough stretch to move in."],
    selvedge: ["Raw {color} selvedge denim woven on vintage looms. Stiff at first, then fades to match your life.", "Heavyweight {color} selvedge with a clean red-line edge. Wear them hard, wash them rarely."],
    relaxed: ["Easy room through the seat and thigh with a gentle taper. {color} denim that feels broken in from the first wear.", "A relaxed, roomy cut in {color}. Comfortable all day and made for boots."],
    tapered: ["Tapered from the knee in {color} denim, with a touch of stretch for comfort.", "Roomy up top and narrow at the ankle. A modern {color} classic."],
    wide: ["A wide, floor-skimming leg in {color} denim with a high rise. Made to be worn with chunky boots.", "Baggy and unbothered in {color}. A relaxed high-rise with plenty of drape."],
  },
  Boots: {
    chelsea: ["A sleek {color} Chelsea boot with elastic side panels and a pull tab. Dress it up or down.", "Clean lines, a slim profile and a {color} finish that looks better with age."],
    ankle: ["An easy side-zip ankle boot in {color} with a stacked heel and a cushioned footbed.", "Slip-on speed in {color}: a smooth ankle boot with a clean side zip."],
    lace: ["A {color} lace-up boot with a sturdy stacked sole. Breaks in beautifully and lasts for years.", "Classic lace-up lines in {color} with a leather lining and a durable outsole."],
    work: ["Rugged {color} boot with a grippy lug sole and a padded collar. Built for the job, great for the street.", "A hard-wearing {color} work boot with a cushioned insole. Comfortable from the first mile."],
    western: ["A stitched {color} western boot with a slanted heel and a pull-on shaft. A classic, done right.", "Pull-on western style in {color} with a snip toe and a stacked heel."],
    combat: ["A {color} combat boot with a chunky lug sole and a sturdy lace-up front. Tough looks, comfortable fit.", "Heavy-duty style in {color} with a thick sole and a padded collar."],
    engineer: ["A {color} engineer boot with buckled straps, a rounded toe and a thick oil-resistant sole.", "Biker heritage in {color}: pull-on shaft, buckle straps and a chunky heel."],
    tall: ["A tall {color} slouch boot with a block heel. Easy to pull on, easy to love.", "Soft, slouchy and {color}: a tall pull-on boot with a comfortable block heel."],
  },
};
const FEATURES = {
  "Leather Jackets": ["Full-grain leather shell", "Soft viscose lining", "Heavy-duty zips", "Two zip hand pockets", "Inside chest pocket", "Snap-down lapels", "Zip cuffs", "Antique metal hardware", "Hand-finished edges", "Ribbed cuffs and hem"],
  "Denim Jeans": ["Heavyweight cotton denim", "Five-pocket styling", "Button fly", "Reinforced stitching", "Copper rivets", "Garment washed", "Contrast stitching", "Sits at the natural waist", "Hidden coin pocket", "Pre-shrunk"],
  Boots: ["Full-grain leather upper", "Leather lining", "Goodyear-welted construction", "Grippy rubber outsole", "Cushioned insole", "Stacked heel", "Reinforced toe and heel", "Waxed laces", "Pull tab", "Re-soleable"],
};
const MATERIALS = {
  "Leather Jackets": { biker: "Full-grain cowhide shell. Viscose lining. Antique-silver zips.", racer: "Smooth cowhide shell. Cotton-blend lining. Matte nickel zips.", bomber: "Heavy leather shell. Warm lining. Rib-knit trim.", suede: "Brushed cow suede. Cotton lining. Metal snap buttons." },
  "Denim Jeans": { _: "98% cotton, 2% elastane. 12 oz denim. Machine wash cold, inside out.", selvedge: "100% cotton selvedge denim, 14 oz. Wash rarely, cold, inside out." },
  Boots: { _: "Full-grain leather upper. Leather lining. Rubber outsole. Condition with leather balm and wipe clean with a damp cloth.", suede: "Suede or nubuck upper. Leather lining. Rubber outsole. Brush gently and use a protector spray." },
};
const FIT = {
  "Leather Jackets": "True to size, cut slim through the body. Size up if you plan to layer. Model is 6'0\" and wears a M.",
  "Denim Jeans": "True to size. Mid rise. If you are between sizes, size up for a relaxed feel.",
  Boots: "True to US sizing. If you are between sizes, go up half a size. Wear with mid-weight socks.",
};
const SHIPPING = "Ships within 1-2 working days. Free shipping on orders over $50. Free returns within 15 days on unworn items.";
const SIZES = {
  "Leather Jackets": { men: "S, M, L, XL, XXL", women: "XS, S, M, L, XL" },
  "Denim Jeans": { men: "28, 30, 32, 34, 36, 38", women: "24, 26, 28, 30, 32" },
  Boots: { men: "7, 8, 9, 10, 11, 12, 13", women: "5, 6, 7, 8, 9, 10" },
};
const PRICE = { "Leather Jackets": [18900, 44900], "Denim Jeans": [7900, 15900], Boots: [14900, 32900] };
const EMOJI = { "Leather Jackets": "🧥", "Denim Jeans": "👖", Boots: "🥾" };
const COUNT = { "Leather Jackets": 70, "Denim Jeans": 65, Boots: 65 };
const POOLS = { "Leather Jackets": JACKET_PHOTOS, "Denim Jeans": JEANS_PHOTOS, Boots: BOOT_PHOTOS };

// The 16 original jackets keep their old name only on their first (full) picture.
const exName = (slot) => (slot.v === 0 ? slot.photo.existing : undefined);

// ---------- build ----------
const products = [];
const usedNames = new Set();

for (const [category, photos] of Object.entries(POOLS)) {
  // 1. Slots: every photo once as its full picture, then again as a zoom, and so on.
  const slots = [];
  for (let v = 0; v < VARIANTS.length && slots.length < COUNT[category]; v++) {
    for (const photo of shuffle(photos)) if (slots.length < COUNT[category]) slots.push({ photo, v });
  }

  // 2. Style groups: up to 3 slots of the same family in different colours share a style name
  //    (the product page shows them as colour swatches).
  const groups = [];
  const left = [...slots];
  while (left.length) {
    const first = left.shift();
    const group = [first];
    if (!exName(first)) {
      for (let i = 0; i < left.length && group.length < 3; ) {
        const s = left[i];
        const ok = !exName(s) && s.photo.family === first.photo.family && !!s.photo.women === !!first.photo.women && !group.some((g) => g.photo.color === s.photo.color);
        if (ok) group.push(...left.splice(i, 1));
        else i++;
      }
    }
    groups.push(group);
  }

  // 3. Products.
  for (const group of groups) {
    const lead = group[0].photo;
    const leadEx = exName(group[0]);
    let baseName = leadEx || `${nextStyle()} ${lead.type}${lead.women ? " (Women's)" : ""}`;
    while (!leadEx && usedNames.has(baseName.toLowerCase())) baseName = `${nextStyle()} ${lead.type}${lead.women ? " (Women's)" : ""}`;
    const groupId = slug(baseName);
    const [lo, hi] = PRICE[category];
    const groupPrice = Math.round((lo + rand() * (hi - lo)) / 500) * 500 - 100; // e.g. 24900
    const sale = !leadEx && rand() < 0.2;

    for (const { photo, v } of group) {
      const name = baseName;
      const mainFile = await makePicture(photo, VARIANTS[v]);
      const others = [];
      for (const variant of VARIANTS) if (variant !== VARIANTS[v]) others.push(await makePicture(photo, variant));
      const detailPhoto = { id: DETAIL_PHOTOS[category], src: `catalog/raw/${DETAIL_PHOTOS[category]}.jpg` };
      const detailFile = await makePicture(detailPhoto, "full");

      const fam = photo.family;
      const descs = DESC[category][fam] || Object.values(DESC[category])[0];
      const description = pick(descs).replaceAll("{color}", photo.color.toLowerCase()).replaceAll("{type}", photo.type.toLowerCase());
      const matKey = category === "Boots" ? (/suede|nubuck/i.test(photo.color) ? "suede" : "_") : category === "Denim Jeans" ? (fam === "selvedge" ? "selvedge" : "_") : fam;
      const price = groupPrice + (leadEx ? 0 : Math.round((rand() - 0.5) * 4) * 500);
      const roll = rand();
      const stock = roll < 0.04 ? 0 : roll < 0.14 ? 1 + Math.floor(rand() * 5) : 8 + Math.floor(rand() * 32);
      const isNew = rand() < 0.18;
      const featured = rand() < 0.12;
      products.push({
        id: slug(leadEx ? name : `${name}-${photo.color}`),
        existing: leadEx,
        name,
        category,
        price,
        compare_at_price: sale ? Math.round((price * 1.25) / 500) * 500 : null,
        emoji: EMOJI[category],
        color: "#eef0f4",
        description,
        stock,
        sizes: SIZES[category][photo.women ? "women" : "men"],
        hidden: false,
        featured,
        is_new: isNew,
        badge: sale ? "Sale" : isNew ? "New Arrival" : featured ? "Best Seller" : "",
        color_name: photo.color,
        color_hex: photo.hex,
        style_group: groupId,
        details: category === "Leather Jackets" ? "Hand-finished edges, heavy-duty zips and a fully lined body." : category === "Denim Jeans" ? "Cut and sewn from sturdy denim with reinforced stress points and a clean finish." : "Built on a durable sole with a cushioned footbed and a leather lining.",
        materials: MATERIALS[category][matKey] || MATERIALS[category]._ || Object.values(MATERIALS[category])[0],
        fit: FIT[category],
        shipping_info: SHIPPING,
        features: shuffle(FEATURES[category]).slice(0, 4),
        imageFile: mainFile,
        galleryFiles: [...others, detailFile],
        _women: !!photo.women,
      });
    }
    usedNames.add(baseName.toLowerCase());
  }
}

// De-duplicate ids (same style + same colour twice) by numbering them.
const seen = new Map();
for (const p of products) {
  const n = (seen.get(p.id) || 0) + 1;
  seen.set(p.id, n);
  if (n > 1) p.id = `${p.id}-${n}`;
}

// Category tile pictures.
const categoryFiles = {};
for (const [cat, id] of Object.entries(CATEGORY_PHOTOS)) {
  const photo = [...JACKET_PHOTOS, ...JEANS_PHOTOS, ...BOOT_PHOTOS].find((p) => p.id === id) || { id, src: `catalog/raw/${id}.jpg` };
  categoryFiles[cat] = await makePicture(photo, "full");
}

await writeFile(`${OUT}products.json`, JSON.stringify({ products, categoryFiles }, null, 1));
const by = (c) => products.filter((p) => p.category === c).length;
console.log(`built ${products.length} products (jackets ${by("Leather Jackets")}, jeans ${by("Denim Jeans")}, boots ${by("Boots")}) and ${made.size} pictures`);
console.log("groups with colour swatches:", new Set(products.map((p) => p.style_group)).size, "styles");
