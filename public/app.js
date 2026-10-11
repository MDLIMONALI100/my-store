// Shared helpers for every page: cart storage, formatting, header badge, toast.
import { DEFAULTS, sanitize, buildCss, fontsUrl } from "/theme.js";

const CART_KEY = "my-store-cart";
// Design settings are injected by the Worker as window.SITE (see src/index.js).
export const SITE = sanitize(window.SITE || DEFAULTS);
export const STORE_NAME = SITE.store_name;

export function formatPrice(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function parseSizes(value) {
  return [...new Set(String(value || "").split(",").map((s) => s.trim()).filter(Boolean))];
}

// Cart lines are { id, size, qty }. The same jacket in two sizes is two lines.
export function getCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    return cart.map((l) => ({ id: l.id, size: l.size || "", qty: l.qty }));
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

export function addToCart(id, qty = 1, size = "") {
  const cart = getCart();
  const line = cart.find((l) => l.id === id && l.size === size);
  if (line) line.qty = Math.min(line.qty + qty, 10);
  else cart.push({ id, size, qty: Math.min(qty, 10) });
  saveCart(cart);
  window.dispatchEvent(new CustomEvent("cart:added", { detail: { id, size, qty } }));
}

export function updateCartCount() {
  const count = getCart().reduce((n, l) => n + l.qty, 0);
  document.querySelectorAll(".cart-count").forEach((el) => {
    const before = Number(el.textContent) || 0;
    el.textContent = count > 0 ? String(count) : "";
    if (count > before) {
      el.classList.remove("bump");
      void el.offsetWidth; // restart the animation
      el.classList.add("bump");
    }
  });
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
  el._timer = setTimeout(() => el.classList.remove("show"), 2200);
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Product photo if there is one, otherwise the emoji on a colored tile.
export function thumb(p) {
  const bg = /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : "#eef0f4";
  return p.image_url
    ? `<div class="thumb has-img" style="background:${bg}"><img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" /></div>`
    : `<div class="thumb" style="background:${bg}" aria-hidden="true">${escapeHtml(p.emoji)}</div>`;
}

// Header and footer are shared by every storefront page. Pages include
// <div data-site-header></div> and <div data-site-footer></div>.
export const CATEGORIES = ["Biker", "Bomber", "Café Racer", "Suede"];
const NAV = [["/", "Shop"], ...CATEGORIES.map((c) => [`/?category=${encodeURIComponent(c)}`, c])];

function renderChrome(site = SITE) {
  const name = escapeHtml(site.store_name);
  const header = document.querySelector("[data-site-header]");
  if (header) {
    const here = location.pathname + location.search;
    const items = site.announcement.split("|").map((t) => t.trim()).filter(Boolean);
    const marquee = items.map((t) => `<span>${escapeHtml(t)}</span><span>★</span>`).join("");
    header.innerHTML = `
      ${items.length ? `<div class="marquee" aria-hidden="true"><div class="marquee-track">${marquee.repeat(Math.max(4, Math.ceil(12 / items.length)))}</div></div>` : ""}
      <header class="site-header">
        <div class="container header-inner">
          <a href="/" class="logo">${name}<span class="logo-dot">.</span></a>
          <nav class="nav" aria-label="Main">
            ${NAV.map(([href, label]) => `<a href="${href}" ${href === here ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
          </nav>
          <a href="/cart" class="cart-link" aria-haspopup="dialog">
            Cart <span class="cart-count"></span>
          </a>
        </div>
      </header>`;
  }
  const footer = document.querySelector("[data-site-footer]");
  if (footer) {
    footer.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <h4>Shop</h4>
              ${NAV.map(([href, label]) => `<a href="${href}">${label === "Shop" ? "All jackets" : label}</a>`).join("")}
            </div>
            <div>
              <h4>Help</h4>
              <a href="/cart">Your cart</a>
              <span>Free shipping over $50</span>
              <span>No payment taken online</span>
            </div>
            <div class="footer-note">
              <h4>${name}</h4>
              <p>Leather jackets with attitude. Built to be worn in, not worn out.</p>
            </div>
          </div>
          <div class="footer-wordmark" aria-hidden="true">${name}</div>
          <div class="footer-bottom">
            <span>© ${new Date().getFullYear()} ${name}</span>
            <span>Photos: Unsplash</span>
          </div>
        </div>
      </footer>`;
  }
}

renderChrome();
updateCartCount();
// The slide-out cart only exists on the storefront, not in admin.
if (document.querySelector(".site-header .cart-link")) import("/cart-drawer.js");
if (STORE_NAME !== "Streetwear") document.title = document.title.replace("Streetwear", STORE_NAME);

// Live preview: the admin Design page shows the store in an iframe and sends
// unsaved settings here. Only messages from this same site are accepted, and
// they only change what this one browser tab shows.
window.addEventListener("message", (e) => {
  if (e.origin !== location.origin || e.data?.type !== "site-preview") return;
  const site = sanitize(e.data.settings);
  let style = document.getElementById("site-settings");
  if (!style) {
    style = document.createElement("style");
    style.id = "site-settings";
    document.head.appendChild(style);
  }
  style.textContent = buildCss(site);
  const font = document.getElementById("font-link");
  if (font) font.href = fontsUrl(site);
  document.querySelectorAll("[data-setting]").forEach((el) => {
    const key = el.dataset.setting;
    if (!(key in site)) return;
    if (key === "shop_title" && new URLSearchParams(location.search).get("category")) return;
    el.textContent = site[key];
  });
  document.querySelectorAll("[data-section]").forEach((el) => {
    el.style.display = site[el.dataset.section] ? "" : "none";
  });
  renderChrome(site);
  updateCartCount();
});
if (window.parent !== window) window.parent.postMessage({ type: "preview-ready" }, location.origin);
