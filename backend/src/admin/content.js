// Admin: the content that makes up the storefront. Categories, menus, pages, home page
// sections and outfits all follow the same pattern, so they share one small CRUD helper
// driven by the table descriptions below.
import { Router } from "express";
import { cleanData, db, httpError, isImageId, NOW_SQL, safeHref, uniqueSlug } from "../lib/util.js";

const router = Router();

const HOME_SECTION_TYPES = ["hero", "categories", "product_rail", "banner", "outfits", "viewer360", "perks", "newsletter", "text", "reviews"];
const MENU_LOCATIONS = ["header", "footer_shop", "footer_info"];

// Field types: s = text, n = whole number, b = yes/no, img = photo id, href = link,
// enum = one of a list, json = free-form data (cleaned), nullable-n = number or empty.
const RESOURCES = {
  categories: {
    table: "categories", slugFrom: "name", order: "sort_order, name",
    fields: {
      name: { t: "s", max: 60, req: true }, tagline: { t: "s", max: 120 }, description: { t: "s", max: 1000 },
      image_id: { t: "img" }, sort_order: { t: "n" }, hidden: { t: "b" },
    },
  },
  menus: {
    table: "menus", auto: true, order: "location, sort_order, id",
    fields: {
      location: { t: "enum", values: MENU_LOCATIONS, req: true }, label: { t: "s", max: 40, req: true },
      href: { t: "href", req: true }, parent_id: { t: "nn" }, sort_order: { t: "n" }, hidden: { t: "b" },
    },
  },
  pages: {
    table: "pages", slugFrom: "title", order: "title",
    fields: {
      title: { t: "s", max: 100, req: true }, subtitle: { t: "s", max: 200 }, content: { t: "json", array: true },
      meta_description: { t: "s", max: 300 }, hidden: { t: "b" },
    },
    touch: true,
  },
  "home-sections": {
    table: "home_sections", auto: true, order: "sort_order, id",
    fields: { type: { t: "enum", values: HOME_SECTION_TYPES, req: true }, sort_order: { t: "n" }, hidden: { t: "b" }, data: { t: "json" } },
  },
  outfits: {
    table: "outfits", slugFrom: "name", order: "sort_order, name",
    fields: {
      name: { t: "s", max: 80, req: true }, description: { t: "s", max: 600 }, image_id: { t: "img" },
      sort_order: { t: "n" }, hidden: { t: "b" },
    },
  },
};

// Turns the request body into column values, checking every field.
// Only fields that were sent are returned, so an update can change just one thing.
async function readFields(res_, body, { partial }) {
  const out = {};
  for (const [name, f] of Object.entries(res_.fields)) {
    const v = body?.[name];
    if (v === undefined) {
      if (!partial && f.req) throw httpError(400, `${name} is required`);
      continue;
    }
    if (f.t === "s") {
      const s = typeof v === "string" ? v.trim().slice(0, f.max) : "";
      if (f.req && !s) throw httpError(400, `${name} is required`);
      out[name] = s;
    } else if (f.t === "n") {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 1_000_000) throw httpError(400, `${name} must be a whole number`);
      out[name] = n;
    } else if (f.t === "nn") {
      out[name] = v === null || v === "" ? null : Number.isInteger(Number(v)) ? Number(v) : null;
    } else if (f.t === "b") out[name] = v ? 1 : 0;
    else if (f.t === "href") {
      const h = safeHref(v);
      if (!h) throw httpError(400, "Please enter a link starting with / or https://");
      out[name] = h;
    } else if (f.t === "enum") {
      if (!f.values.includes(v)) throw httpError(400, `${name} must be one of: ${f.values.join(", ")}`);
      out[name] = v;
    } else if (f.t === "img") {
      if (v === null || v === "") out[name] = null;
      else {
        if (!isImageId(v)) throw httpError(400, "Invalid image");
        const found = await db().prepare(`SELECT id FROM images WHERE id = ?`).bind(v).first();
        if (!found) throw httpError(400, "Photo not found. Please upload it again.");
        out[name] = v;
      }
    } else if (f.t === "json") {
      const cleaned = cleanData(v);
      if (f.array ? !Array.isArray(cleaned) : cleaned === null || Array.isArray(cleaned) || typeof cleaned !== "object") {
        throw httpError(400, `${name} has the wrong shape`);
      }
      const text = JSON.stringify(cleaned);
      if (text.length > 30_000) throw httpError(400, `${name} is too large`);
      out[name] = text;
    }
  }
  return out;
}

// Rows come back with JSON columns opened up and photo ids turned into URLs.
function present(row) {
  if (!row) return row;
  const out = { ...row };
  for (const key of ["data", "content"]) {
    if (typeof out[key] === "string") {
      try {
        out[key] = JSON.parse(out[key]);
      } catch {}
    }
  }
  if ("image_id" in out) out.image_url = out.image_id ? `/images/${out.image_id}` : null;
  return out;
}

for (const [route, r] of Object.entries(RESOURCES)) {
  const pk = r.auto ? "id" : "id";

  router.get(`/${route}`, async (req, res) => {
    const { results } = await db().prepare(`SELECT * FROM ${r.table} ORDER BY ${r.order}`).all();
    res.json({ items: results.map(present) });
  });

  router.post(`/${route}`, async (req, res) => {
    const values = await readFields(r, req.body, { partial: false });
    if (!("sort_order" in values) && r.fields.sort_order) {
      values.sort_order = (await db().prepare(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM ${r.table}`).first()).n;
    }
    const cols = Object.keys(values);
    if (r.slugFrom) {
      const id = await uniqueSlug(r.table, values[r.slugFrom], route);
      await db().prepare(`INSERT INTO ${r.table} (id, ${cols.join(", ")}) VALUES (?, ${cols.map(() => "?").join(", ")})`).bind(id, ...cols.map((c) => values[c])).run();
      return res.status(201).json({ item: await getOne(r, id) });
    }
    const info = await db().prepare(`INSERT INTO ${r.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`).bind(...cols.map((c) => values[c])).run();
    res.status(201).json({ item: await getOne(r, info.meta.last_row_id) });
  });

  // Re-order a list: PUT /api/admin/<resource>/order  { "ids": [3, 1, 2] }
  router.put(`/${route}/order`, async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 500) : [];
    if (!ids.length) throw httpError(400, "Send the list of ids in the new order");
    await db().batch(ids.map((id, i) => db().prepare(`UPDATE ${r.table} SET sort_order = ? WHERE id = ?`).bind(i + 1, id)));
    res.json({ ok: true });
  });

  router.get(`/${route}/:id`, async (req, res) => {
    const item = await getOne(r, req.params.id);
    if (!item) throw httpError(404, "Not found");
    res.json({ item });
  });

  router.put(`/${route}/:id`, async (req, res) => {
    const existing = await db().prepare(`SELECT * FROM ${r.table} WHERE ${pk} = ?`).bind(req.params.id).first();
    if (!existing) throw httpError(404, "Not found");
    const values = await readFields(r, req.body, { partial: true });
    const cols = Object.keys(values);
    if (!cols.length) return res.json({ item: present(existing) });

    const statements = [
      db()
        .prepare(`UPDATE ${r.table} SET ${cols.map((c) => `${c} = ?`).join(", ")}${r.touch ? `, updated_at = ${NOW_SQL}` : ""} WHERE ${pk} = ?`)
        .bind(...cols.map((c) => values[c]), req.params.id),
    ];
    // Products refer to their category by name, so renaming a category renames them too.
    if (route === "categories" && values.name && values.name !== existing.name) {
      statements.push(db().prepare(`UPDATE products SET category = ? WHERE category = ?`).bind(values.name, existing.name));
    }
    try {
      await db().batch(statements);
    } catch (err) {
      if (String(err?.message).includes("UNIQUE")) throw httpError(409, "That name is already used");
      throw err;
    }
    res.json({ item: await getOne(r, req.params.id) });
  });

  router.delete(`/${route}/:id`, async (req, res) => {
    const existing = await db().prepare(`SELECT * FROM ${r.table} WHERE ${pk} = ?`).bind(req.params.id).first();
    if (!existing) throw httpError(404, "Not found");
    if (route === "categories") {
      const n = await db().prepare(`SELECT COUNT(*) AS n FROM products WHERE category = ?`).bind(existing.name).first();
      if (n.n > 0) throw httpError(409, `${n.n} products are still in this category. Move or delete them first.`);
    }
    const statements = [db().prepare(`DELETE FROM ${r.table} WHERE ${pk} = ?`).bind(req.params.id)];
    if (route === "outfits") statements.push(db().prepare(`DELETE FROM outfit_items WHERE outfit_id = ?`).bind(req.params.id));
    if (route === "menus") statements.push(db().prepare(`UPDATE menus SET parent_id = NULL WHERE parent_id = ?`).bind(req.params.id));
    await db().batch(statements);
    res.json({ deleted: req.params.id });
  });
}

async function getOne(r, id) {
  const row = await db().prepare(`SELECT * FROM ${r.table} WHERE id = ?`).bind(id).first();
  if (!row) return null;
  const item = present(row);
  if (r.table === "outfits") {
    const { results } = await db().prepare(`SELECT product_id FROM outfit_items WHERE outfit_id = ? ORDER BY sort_order`).bind(id).all();
    item.product_ids = results.map((x) => x.product_id);
  }
  return item;
}

// The products in an outfit: PUT /api/admin/outfits/:id/products  { "ids": ["slug", ...] }
router.put("/outfits/:id/products", async (req, res) => {
  const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).filter((i) => typeof i === "string" && /^[a-z0-9-]{1,80}$/.test(i)))].slice(0, 12);
  const outfit = await db().prepare(`SELECT id FROM outfits WHERE id = ?`).bind(req.params.id).first();
  if (!outfit) throw httpError(404, "Outfit not found");
  if (ids.length) {
    const { results } = await db().prepare(`SELECT id FROM products WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all();
    if (results.length !== ids.length) throw httpError(400, "One of the products doesn't exist");
  }
  await db().batch([
    db().prepare(`DELETE FROM outfit_items WHERE outfit_id = ?`).bind(outfit.id),
    ...ids.map((pid, i) => db().prepare(`INSERT INTO outfit_items (outfit_id, product_id, sort_order) VALUES (?, ?, ?)`).bind(outfit.id, pid, i)),
  ]);
  res.json({ outfit_id: outfit.id, product_ids: ids });
});

export default router;
