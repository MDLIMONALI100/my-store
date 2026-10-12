// Downloads the candidate Unsplash photos (resized to 1200px wide) into seed/catalog/raw/.
// Photos are free to use under the Unsplash License (see seed/PHOTO_CREDITS.md).
import { readFile, writeFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
// sharp (image tool) is already installed with the frontend, so borrow it from there.
const sharp = createRequire(new URL("../../frontend/package.json", import.meta.url))("sharp");

const list = JSON.parse(await readFile(new URL("./candidates.json", import.meta.url)));
const ids = Object.values(list).flat();
let ok = 0, bad = [];
await Promise.all(ids.map(async (id, i) => {
  const file = new URL(`../../seed/catalog/raw/${id}.jpg`, import.meta.url);
  try { await stat(file); ok++; return; } catch {}
  try {
    const res = await fetch(`https://images.unsplash.com/photo-${id}?w=1200&q=82&fm=jpg&fit=max`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok || !(res.headers.get("content-type") || "").startsWith("image/")) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata(); // throws if it isn't a real image
    if (!meta.width || meta.width < 600) throw new Error("too small");
    await writeFile(file, buf);
    ok++;
  } catch (e) { bad.push(`${id}: ${e.message}`); }
}));
console.log(`downloaded/kept ${ok} of ${ids.length}`);
if (bad.length) console.log("failed:\n" + bad.join("\n"));
