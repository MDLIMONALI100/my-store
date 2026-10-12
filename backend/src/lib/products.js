// Reading products. One place builds the shop queries (filters, search, sort, paging)
// so the storefront, cart and admin all see the same fields.
import { db, likeEscape, parseJson } from "./util.js";

// Fields every product list needs. "image_url" is the main photo, "hover_url" the
// second photo shown when you hover a card.
export const PRODUCT_COLS = `p.id, p.name, p.category, p.price, p.compare_at_price, p.emoji, p.color, p.description, p.stock,
  p.sizes, p.rating_avg, p.rating_count, p.badge, p.featured, p.is_new, p.color_name, p.color_hex, p.style_group,
  CASE WHEN p.image_id IS NULL THEN NULL ELSE '/images/' || p.image_id END AS image_url,
  (SELECT '/images/' || pi.image_id FROM product_images pi
    WHERE pi.product_id = p.id AND pi.image_id IS NOT p.image_id ORDER BY pi.sort_order LIMIT 1) AS hover_url`;

export const SORTS = {
  featured: "p.featured DESC, p.sort_order",
  newest: "p.sort_order DESC",
  popular: "p.rating_count DESC, p.sort_order",
  price_asc: "p.price ASC, p.sort_order",
  price_desc: "p.price DESC, p.sort_order",
  name_asc: "p.name COLLATE NOCASE ASC",
};

const int = (v, fallback = null) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};
const flag = (v) => v === "1" || v === "true";

// A category can be given by its URL slug ("boots") or its name ("Boots").
export async function categoryName(value) {
  if (!value) return null;
  const row = await db().prepare(`SELECT name FROM categories WHERE id = ? OR name = ?`).bind(value, value).first();
  return row ? row.name : value;
}

// Builds the WHERE clause from ?category=&q=&size=&color=&minPrice=&maxPrice=&featured=&new=&sale=&ids=
async function buildWhere(query, { admin }) {
  const where = [];
  const binds = [];
  if (!admin) where.push("p.hidden = 0");

  const category = await categoryName(query.category);
  if (category) (where.push("p.category = ?"), binds.push(category));

  const q = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
  if (q) {
    const like = `%${likeEscape(q)}%`;
    where.push(`(p.name LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\' OR p.category LIKE ? ESCAPE '\\' OR p.color_name LIKE ? ESCAPE '\\')`);
    binds.push(like, like, like, like);
  }

  const size = typeof query.size === "string" ? query.size.trim().slice(0, 12) : "";
  if (size) {
    where.push(`(',' || REPLACE(p.sizes, ' ', '') || ',') LIKE ? ESCAPE '\\'`);
    binds.push(`%,${likeEscape(size)},%`);
  }

  const color = typeof query.color === "string" ? query.color.trim().slice(0, 40) : "";
  if (color) (where.push("p.color_name = ? COLLATE NOCASE"), binds.push(color));

  const min = int(query.minPrice);
  const max = int(query.maxPrice);
  if (min !== null) (where.push("p.price >= ?"), binds.push(min));
  if (max !== null) (where.push("p.price <= ?"), binds.push(max));

  if (flag(query.featured)) where.push("p.featured = 1");
  if (flag(query.new)) where.push("p.is_new = 1");
  if (flag(query.sale)) where.push("p.compare_at_price IS NOT NULL AND p.compare_at_price > p.price");
  if (flag(query.inStock)) where.push("p.stock > 0");
  // Admin only: ?hidden=1 shows just hidden products, ?hidden=0 just visible ones.
  if (admin && query.hidden === "1") where.push("p.hidden = 1");
  if (admin && query.hidden === "0") where.push("p.hidden = 0");

  return { clause: where.length ? `WHERE ${where.join(" AND ")}` : "", binds };
}

export async function listProducts(query, { admin = false } = {}) {
  const { clause, binds } = await buildWhere(query, { admin });
  // The shop lists oldest first (keeps your chosen order); the admin shows the newest products first.
  const sort = SORTS[query.sort] || (admin ? "p.hidden ASC, p.sort_order DESC" : "p.sort_order");
  const limit = Math.min(Math.max(int(query.limit, 24), 1), 200);
  const offset = Math.max(int(query.offset, 0), 0);

  const [{ results }, countRow] = await db().batch([
    db().prepare(`SELECT ${PRODUCT_COLS}${admin ? ", p.hidden, p.image_id, p.sort_order" : ""} FROM products p ${clause} ORDER BY ${sort} LIMIT ? OFFSET ?`).bind(...binds, limit, offset),
    db().prepare(`SELECT COUNT(*) AS n FROM products p ${clause}`).bind(...binds),
  ]);
  return { products: results, total: countRow.results[0].n, limit, offset };
}

// Products for the cart: ?ids=a,b,c (max 50), hidden ones excluded.
export async function productsByIds(ids) {
  const list = [...new Set(ids)].filter((id) => /^[a-z0-9-]{1,80}$/.test(id)).slice(0, 50);
  if (!list.length) return [];
  const { results } = await db()
    .prepare(`SELECT ${PRODUCT_COLS} FROM products p WHERE p.hidden = 0 AND p.id IN (${list.map(() => "?").join(",")})`)
    .bind(...list)
    .all();
  return results;
}

// What filters to offer for a set of products: sizes, colours, price range, category counts.
export async function productFacets(query) {
  const base = { ...query, size: "", color: "", minPrice: "", maxPrice: "" };
  const { clause, binds } = await buildWhere(base, { admin: false });
  const [sizesRes, colorsRes, priceRes, catsRes] = await db().batch([
    db().prepare(`SELECT p.sizes FROM products p ${clause}`).bind(...binds),
    db().prepare(`SELECT p.color_name AS name, MIN(p.color_hex) AS hex, COUNT(*) AS count FROM products p ${clause ? clause + " AND" : "WHERE"} p.color_name != '' GROUP BY p.color_name ORDER BY count DESC`).bind(...binds),
    db().prepare(`SELECT MIN(p.price) AS min, MAX(p.price) AS max FROM products p ${clause}`).bind(...binds),
    db().prepare(`SELECT c.id, c.name, (SELECT COUNT(*) FROM products p WHERE p.category = c.name AND p.hidden = 0) AS count FROM categories c WHERE c.hidden = 0 ORDER BY c.sort_order`),
  ]);
  const sizes = new Set();
  for (const r of sizesRes.results) for (const s of String(r.sizes || "").split(",")) if (s.trim()) sizes.add(s.trim());
  return {
    sizes: [...sizes],
    colors: colorsRes.results,
    price: priceRes.results[0] || { min: 0, max: 0 },
    categories: catsRes.results,
  };
}

// One product with everything the product page needs.
export async function getProductDetail(id) {
  const p = await db()
    .prepare(`SELECT ${PRODUCT_COLS}, p.details, p.materials, p.fit, p.shipping_info, p.features FROM products p WHERE p.id = ? AND p.hidden = 0`)
    .bind(id)
    .first();
  if (!p) return null;

  const [gallery, colors, related, category] = await db().batch([
    db().prepare(
      `SELECT '/images/' || image_id AS url FROM (
         SELECT image_id, 0 AS sort_order FROM products WHERE id = ?1 AND image_id IS NOT NULL
         UNION
         SELECT image_id, sort_order + 1 FROM product_images WHERE product_id = ?1
       ) ORDER BY sort_order`
    ).bind(id),
    p.style_group
      ? db().prepare(
          `SELECT id, color_name, color_hex, CASE WHEN image_id IS NULL THEN NULL ELSE '/images/' || image_id END AS image_url
           FROM products WHERE style_group = ? AND hidden = 0 ORDER BY sort_order`
        ).bind(p.style_group)
      : db().prepare(`SELECT 1 WHERE 0`),
    db().prepare(`SELECT ${PRODUCT_COLS} FROM products p WHERE p.hidden = 0 AND p.category = ? AND p.id != ? ORDER BY p.featured DESC, p.sort_order LIMIT 8`).bind(p.category, id),
    db().prepare(`SELECT id, name FROM categories WHERE name = ?`).bind(p.category),
  ]);

  return {
    ...p,
    features: parseJson(p.features, []),
    gallery: gallery.results.map((g) => g.url),
    colors: colors.results,
    related: related.results,
    category_slug: category.results[0]?.id || null,
  };
}
