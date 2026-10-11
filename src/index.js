import { products, findProduct } from "./products.js";

const SHIPPING_FLAT = 500;
const FREE_SHIPPING_OVER = 5000;
const MAX_QTY = 10;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, url);
      } catch (err) {
        return json({ error: "Internal error" }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleApi(request, url) {
  const path = url.pathname.replace(/\/+$/, "");

  if (path === "/api/products" && request.method === "GET") {
    const category = url.searchParams.get("category");
    const list = category ? products.filter((p) => p.category === category) : products;
    return json({ products: list });
  }

  const match = path.match(/^\/api\/products\/([a-z0-9-]+)$/);
  if (match && request.method === "GET") {
    const product = findProduct(match[1]);
    return product ? json({ product }) : json({ error: "Product not found" }, 404);
  }

  if (path === "/api/checkout" && request.method === "POST") {
    return checkout(request);
  }

  return json({ error: "Not found" }, 404);
}

// Prices are recalculated on the server so the browser can't change them.
// Demo only: no payment is taken and no order is stored.
async function checkout(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return json({ error: "Your cart is empty" }, 400);
  }

  const lines = [];
  for (const item of items) {
    const product = findProduct(item?.id);
    const qty = Number(item?.qty);
    if (!product) return json({ error: `Unknown product: ${item?.id}` }, 400);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return json({ error: `Invalid quantity for ${product.name}` }, 400);
    }
    if (product.stock === 0) {
      return json({ error: `${product.name} is sold out` }, 409);
    }
    if (qty > product.stock) {
      return json({ error: `Only ${product.stock} ${product.name} left in stock` }, 409);
    }
    lines.push({ id: product.id, name: product.name, qty, unitPrice: product.price, lineTotal: product.price * qty });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const shipping = subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;

  return json({
    orderId: "ORD-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
    lines,
    subtotal,
    shipping,
    total: subtotal + shipping,
    note: "Demo order: no payment was taken.",
  });
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
