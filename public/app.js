// Shared helpers for every page: cart storage, formatting, header badge, toast.
const CART_KEY = "my-store-cart";
export const STORE_NAME = "Streetwear";

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
}

export function updateCartCount() {
  const count = getCart().reduce((n, l) => n + l.qty, 0);
  document.querySelectorAll(".cart-count").forEach((el) => (el.textContent = count > 0 ? String(count) : ""));
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

function renderChrome() {
  const header = document.querySelector("[data-site-header]");
  if (header) {
    const here = location.pathname + location.search;
    header.outerHTML = `
      <div class="marquee" aria-hidden="true">
        <div class="marquee-track">
          ${"<span>Leather season is here</span><span>★</span><span>Free shipping over $50</span><span>★</span><span>New drop: 16 jackets</span><span>★</span>".repeat(4)}
        </div>
      </div>
      <header class="site-header">
        <div class="container header-inner">
          <a href="/" class="logo">${STORE_NAME}<span class="logo-dot">.</span></a>
          <nav class="nav" aria-label="Main">
            ${NAV.map(([href, label]) => `<a href="${href}" ${href === here ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
          </nav>
          <a href="/cart" class="cart-link" ${location.pathname === "/cart" ? 'aria-current="page"' : ""}>
            Cart <span class="cart-count"></span>
          </a>
        </div>
      </header>`;
  }
  const footer = document.querySelector("[data-site-footer]");
  if (footer) {
    footer.outerHTML = `
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
              <h4>${STORE_NAME}</h4>
              <p>Leather jackets with attitude. Built to be worn in, not worn out.</p>
            </div>
          </div>
          <div class="footer-wordmark" aria-hidden="true">${STORE_NAME.toUpperCase()}</div>
          <div class="footer-bottom">
            <span>© ${new Date().getFullYear()} ${STORE_NAME}</span>
            <span>Photos: Unsplash</span>
          </div>
        </div>
      </footer>`;
  }
}

renderChrome();
updateCartCount();
