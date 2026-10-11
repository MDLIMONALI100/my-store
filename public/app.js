// Shared helpers for every page: cart storage, formatting, header badge, toast.
const CART_KEY = "my-store-cart";

export function formatPrice(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {}
  updateCartCount();
}

export function addToCart(id, qty = 1) {
  const cart = getCart();
  const line = cart.find((l) => l.id === id);
  if (line) line.qty = Math.min(line.qty + qty, 10);
  else cart.push({ id, qty: Math.min(qty, 10) });
  saveCart(cart);
}

export function updateCartCount() {
  const el = document.querySelector(".cart-count");
  if (!el) return;
  const count = getCart().reduce((n, l) => n + l.qty, 0);
  el.textContent = count > 0 ? String(count) : "";
}

export async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function toast(message) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 2000);
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

updateCartCount();

// Product photo if there is one, otherwise the emoji on a colored tile.
export function thumb(p) {
  const bg = /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : "#eef0f4";
  return p.image_url
    ? `<div class="thumb has-img" style="background:${bg}"><img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" /></div>`
    : `<div class="thumb" style="background:${bg}" aria-hidden="true">${escapeHtml(p.emoji)}</div>`;
}
