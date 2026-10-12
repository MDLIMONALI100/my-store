// Makes numbered contact sheets of the downloaded photos so they can be reviewed by eye.
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const sharp = createRequire(new URL("../../frontend/package.json", import.meta.url))("sharp");
const out = process.argv[2];
const list = JSON.parse(await readFile(new URL("./candidates.json", import.meta.url)));
const all = (list[process.argv[3] || "boots"] || []).map((id) => ["x", id]);
const W = 300, H = 375, COLS = 4, PER = 16;
for (let s = 0; s * PER < all.length; s++) {
  const chunk = all.slice(s * PER, s * PER + PER);
  const tiles = await Promise.all(chunk.map(async ([kind, id], i) => {
    const n = s * PER + i;
    const img = await sharp(new URL(`../../seed/catalog/raw/${id}.jpg`, import.meta.url).pathname).resize(W, H, { fit: "cover" }).toBuffer();
    const label = Buffer.from(`<svg width="${W}" height="${H}"><rect x="0" y="0" width="64" height="34" fill="#fff"/><text x="8" y="25" font-size="24" font-family="Arial" font-weight="700">${n}</text></svg>`);
    return { input: await sharp(img).composite([{ input: label }]).toBuffer(), left: (i % COLS) * W, top: Math.floor(i / COLS) * H };
  }));
  const rows = Math.ceil(chunk.length / COLS);
  await sharp({ create: { width: W * COLS, height: H * rows, channels: 3, background: "#fff" } }).composite(tiles).jpeg({ quality: 80 }).toFile(`${out}/${process.argv[3]}-${s}.jpg`);
}
console.log("sheets:", Math.ceil(all.length / PER));
