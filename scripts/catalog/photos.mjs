// The curated photo pool. Every entry says what the photo ACTUALLY shows, and the
// catalog builder uses that to name products, so a tan suede boot is never called "black".
//
//   src    where the file is: seed/jackets/<id>.webp (original 16) or seed/catalog/raw/<id>.jpg
//   family groups photos that can be colour variants of one style
//   type   the product type shown in the name, e.g. "Chelsea Boot"
//   color  colour name + swatch hex     women  true = women's cut
//
// Photo ids are Unsplash photo ids (free to use, see seed/PHOTO_CREDITS.md).
import { readFileSync } from "node:fs";

const list = JSON.parse(readFileSync(new URL("./candidates.json", import.meta.url)));
const boot = (i) => list.boots[i];
const jean = (i) => list.jeans[i];
const jean2 = (i) => list.jeans2[i];
const jack2 = (i) => list.jackets2[i];

const j = (id, family, type, color, hex, extra = {}) => ({ id, src: `jackets/${id}.webp`, category: "Leather Jackets", family, type, color, hex, ...extra });
const n = (id, category, family, type, color, hex, extra = {}) => ({ id, src: `catalog/raw/${id}.jpg`, category, family, type, color, hex, ...extra });
const J = (id, ...rest) => n(id, "Leather Jackets", ...rest);
const D = (id, ...rest) => n(id, "Denim Jeans", ...rest);
const B = (id, ...rest) => n(id, "Boots", ...rest);

// The 16 jackets already in the store keep their names, prices and ids ("existing").
export const JACKET_PHOTOS = [
  j("1551028719-00167b16eac5", "biker", "Biker Jacket", "Black", "#1a1a1a", { existing: "Midnight Asymmetric Biker" }),
  j("1727515546577-f7d82a47b51d", "biker", "Moto Jacket", "Black", "#1a1a1a", { existing: "Onyx Classic Moto" }),
  j("1727515192207-3dc860bfd773", "biker", "Rider Jacket", "Black", "#1a1a1a", { existing: "Shadow Rider" }),
  j("1602370463198-086436840055", "biker", "Fitted Moto Jacket", "Black", "#1a1a1a", { existing: "Noir Fitted Moto (Women's)", women: true }),
  j("1521223890158-f9f7c3d5d504", "biker", "Distressed Biker Jacket", "Black", "#2a2a2a", { existing: "Rebel Distressed Biker" }),
  j("1592158249887-ac6ae7921691", "biker", "Biker Jacket", "Black", "#1a1a1a", { existing: "Night Shift Biker" }),
  j("1636730788177-faca4ef63e44", "biker", "Moto Jacket", "Crimson", "#8b1e2d", { existing: "Crimson Moto (Women's)", women: true }),
  j("1511280303142-0051e93baeeb", "biker", "Cropped Biker Jacket", "Black", "#1a1a1a", { existing: "Cropped Street Leather (Women's)", women: true }),
  j("1700168077358-692db90c8b7f", "bomber", "Shearling Aviator Jacket", "Brown", "#6b4226", { existing: "Shearling Aviator Bomber" }),
  j("1777293875577-da93247013f2", "bomber", "Leather Bomber", "Black", "#1a1a1a", { existing: "Oversized Leather Bomber (Women's)", women: true }),
  j("1615908280461-d7a332579330", "bomber", "Shearling Collar Jacket", "Black", "#1a1a1a", { existing: "Highway Shearling Collar Jacket" }),
  j("1623854156816-4c4fc355ffc7", "racer", "Café Racer Jacket", "Cognac", "#9a5b2e", { existing: "Cognac Café Racer" }),
  j("1578198576866-7e0ba6078128", "racer", "Trucker Jacket", "Brown", "#5b3a24", { existing: "Burnt Umber Trucker" }),
  j("1700993443419-b6f067e734e4", "racer", "Café Racer Jacket", "Chestnut", "#7a4a2a", { existing: "Chestnut Racer" }),
  j("1760497925596-a6462350c583", "suede", "Suede Overshirt", "Mocha", "#7d6350", { existing: "Mocha Suede Overshirt" }),
  j("1610904497162-f9faef9a8e20", "suede", "Suede Western Jacket", "Tobacco", "#8a6a3c", { existing: "Tobacco Suede Western" }),
  // New photos (indexes are positions in candidates.json "jackets2")
  J(jack2(0), "biker", "Biker Jacket", "Black", "#1a1a1a"),
  J(jack2(1), "biker", "Moto Jacket", "Black", "#1a1a1a"),
  J(jack2(2), "biker", "Asymmetric Biker Jacket", "Black", "#1a1a1a"),
  J(jack2(3), "biker", "Double Rider Jacket", "Black", "#1a1a1a"),
  J(jack2(4), "biker", "Padded Shoulder Biker", "Black", "#1a1a1a"),
  J(jack2(7), "racer", "Utility Zip Jacket", "Brown", "#6a4128"),
  J(jack2(9), "racer", "Café Racer Jacket", "Cognac", "#a05a2c"),
  J(jack2(10), "racer", "Band Collar Racer", "Cognac", "#8e4e27"),
  J(jack2(12), "suede", "Suede Jacket", "Stone Grey", "#8b8480"),
  J(jack2(13), "racer", "Racer Jacket", "Racing Green", "#1f4a3a"),
  J(jack2(15), "biker", "Cropped Biker Jacket", "Black", "#1a1a1a", { women: true }),
];

export const BOOT_PHOTOS = [
  B(boot(0), "chelsea", "Chelsea Boot", "Tan Suede", "#b5793a"),
  B(boot(1), "chelsea", "Chelsea Boot", "Black", "#1b1b1b"),
  B(boot(2), "chelsea", "Chelsea Boot", "Black", "#1b1b1b"),
  B(boot(3), "chelsea", "Chelsea Boot", "Dark Brown", "#4a2c1c"),
  B(boot(5), "chelsea", "Chelsea Boot", "Chestnut", "#7b3f1d"),
  B(boot(6), "chelsea", "Chelsea Boot", "Dark Brown", "#4a2c1c"),
  B(boot(7), "chelsea", "Chelsea Boot", "Cognac", "#8a4b22"),
  B(boot(8), "ankle", "Side-Zip Ankle Boot", "Tan Nubuck", "#b98a52"),
  B(boot(12), "ankle", "Side-Zip Ankle Boot", "Black", "#1b1b1b", { women: true }),
  B(boot(9), "lace", "Plain-Toe Lace-Up Boot", "Espresso", "#3b2418"),
  B(boot(19), "lace", "Brogue Boot", "Caramel", "#a8662c"),
  B(boot(13), "lace", "Lace-Up Boot", "Rust Brown", "#8b4a2b"),
  B(boot(20), "lace", "Heritage Lace-Up Boot", "Weathered Brown", "#6a4a33"),
  B(boot(24), "lace", "Field Boot", "Brown", "#6b4a30"),
  B(boot(10), "work", "Moc-Toe Work Boot", "Wheat", "#c9a36a"),
  B(boot(11), "work", "Lug-Sole Work Boot", "Tan Nubuck", "#b98a52"),
  B(boot(16), "work", "Trail Boot", "Honey", "#b8772e"),
  B(boot(18), "work", "Pull-On Work Boot", "Wheat", "#c9a36a"),
  B(boot(22), "western", "Western Work Boot", "Brown & Rust", "#7a4a30"),
  B(boot(27), "western", "Western Boot", "Slate", "#55575a"),
  B(boot(29), "western", "Cowboy Boot", "Cognac", "#8d4a25"),
  B(boot(33), "western", "Cowboy Boot", "Tan", "#9a5a2a"),
  B(boot(30), "western", "Cowboy Boot", "Sand", "#b9976a", { women: true }),
  B(boot(32), "western", "Embroidered Western Boot", "Bone", "#e6dccb", { women: true }),
  B(boot(17), "combat", "Combat Boot", "Black", "#1b1b1b"),
  B(boot(34), "combat", "Studded Combat Boot", "Black", "#1b1b1b"),
  B(boot(35), "combat", "Combat Boot", "Black", "#1b1b1b"),
  B(boot(37), "combat", "Polished Combat Boot", "Black", "#1b1b1b"),
  B(boot(36), "combat", "Chunky Combat Boot", "Cream", "#e9dcc4", { women: true }),
  B(boot(40), "engineer", "Engineer Boot", "Black", "#1b1b1b"),
  B(boot(41), "engineer", "Engineer Boot", "Black", "#1b1b1b"),
  B(boot(14), "tall", "Slouch Boot", "Black", "#1b1b1b", { women: true }),
];

export const JEANS_PHOTOS = [
  D(jean(1), "straight", "Straight Jeans", "Mid Indigo", "#3d5a80"),
  D(jean(3), "straight", "Straight Jeans", "Mid Wash", "#4a6fa5"),
  D(jean(7), "straight", "Straight Jeans", "Dark Indigo", "#1f2f4a"),
  D(jean(16), "straight", "Straight Jeans", "Black", "#1c1c1e"),
  D(jean2(0), "straight", "Straight Jeans", "Mid Blue", "#4d6fa0"),
  D(jean2(5), "straight", "Straight Jeans", "Light Blue", "#7fa3cf"),
  D(jean2(8), "straight", "Straight Jeans", "Dark Wash", "#2f4a75"),
  D(jean2(11), "straight", "Straight Jeans", "Ink Navy", "#1b2638"),
  D(jean2(17), "straight", "Straight Jeans", "Faded Blue", "#5c85b8"),
  D(jean(4), "slim", "Slim Jeans", "Stone Wash", "#5a7ba6"),
  D(jean(15), "slim", "Slim Jeans", "Washed Black", "#2a2a2c"),
  D(jean(19), "slim", "Slim Jeans", "Jet Black", "#17171a"),
  D(jean(17), "slim", "Distressed Slim Jeans", "Black", "#202022"),
  D(jean2(2), "slim", "Slim Jeans", "Sky Blue", "#7ea2d0"),
  D(jean2(9), "selvedge", "Selvedge Slim Jeans", "Deep Indigo", "#26385a"),
  D(jean(14), "selvedge", "Raw Selvedge Jeans", "Raw Indigo", "#1d2b4a"),
  D(jean(2), "relaxed", "Relaxed Jeans", "Washed Blue", "#5b7fb0"),
  D(jean2(1), "relaxed", "Relaxed Jeans", "Light Wash", "#8aa9d0"),
  D(jean2(12), "relaxed", "Relaxed Jeans", "Midnight", "#222f4a"),
  D(jean(5), "tapered", "Tapered Jeans", "Indigo", "#34507a"),
  D(jean2(7), "tapered", "Tapered Jeans", "Vintage Blue", "#5d7fae"),
  D(jean(13), "wide", "Wide-Leg Jeans", "Light Wash", "#8fb0d6", { women: true }),
  D(jean2(18), "wide", "Baggy Jeans", "Faded Blue", "#7b9cc4", { women: true }),
];

// Close-up texture shots used as the 5th gallery picture of every product in a category.
export const DETAIL_PHOTOS = {
  "Leather Jackets": jack2(14), // zipper
  "Denim Jeans": jean2(14), // pocket stitching
  Boots: boot(15), // laces and leather grain
};

// Photos used for category tiles.
export const CATEGORY_PHOTOS = {
  "Leather Jackets": "1551028719-00167b16eac5",
  "Denim Jeans": jean2(17),
  Boots: boot(7),
};
