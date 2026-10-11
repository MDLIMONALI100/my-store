// Slide-out cart. Opens when something is added or the Cart link is clicked.
// Three views inside one drawer: bag -> checkout form -> order placed.
import { api, formatPrice, getCart, saveCart, escapeHtml, thumb, parseSizes } from "/app.js";

const SHIPPING_FLAT = 500;
const FREE_SHIPPING_OVER = 5000;

let catalog = null; // id -> product, loaded when the drawer first opens
let view = "bag";
let lastFocus = null;
let highlightKey = null;
let customerDraft = {}; // keeps typed details if the shopper goes back to the bag

const root = document.createElement("div");
root.className = "drawer-root";
root.innerHTML = `
  <div class="drawer-overlay" data-close></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1">
    <header class="drawer-head">
      <h2 id="drawer-title">Your cart</h2>
      <button type="button" class="drawer-close" data-close aria-label="Close cart">✕</button>
    </header>
    <div class="drawer-body" id="drawer-body"></div>
    <footer class="drawer-foot" id="drawer-foot"></footer>
  </aside>`;
document.body.appendChild(root);
const body = root.querySelector("#drawer-body");
const foot = root.querySelector("#drawer-foot");
const title = root.querySelector("#drawer-title");
const drawer = root.querySelector(".drawer");

const lineKey = (l) => `${l.id}|${l.size}`;

async function loadCatalog(force = false) {
  if (catalog && !force) return;
  const { products } = await api("/api/products");
  catalog = Object.fromEntries(products.map((p) => [p.id, p]));
}

// Remove lines whose product or size no longer exists.
function validCart() {
  const cart = getCart().filter((l) => {
    const p = catalog[l.id];
    if (!p) return false;
    const sizes = parseSizes(p.sizes);
    return sizes.length ? sizes.includes(l.size) : !l.size;
  });
  saveCart(cart);
  return cart;
}

function totals(cart) {
  const subtotal = cart.reduce((s, l) => s + catalog[l.id].price * l.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_OVER || subtotal === 0 ? 0 : SHIPPING_FLAT;
  return { subtotal, shipping, total: subtotal + shipping };
}

function render() {
  if (!catalog) {
    body.innerHTML = `<p class="drawer-msg">Loading…</p>`;
    foot.innerHTML = "";
    return;
  }
  if (view === "checkout") return renderCheckout();
  if (view === "done") return;

  const cart = validCart();
  const count = cart.reduce((n, l) => n + l.qty, 0);
  title.textContent = count ? `Your cart (${count})` : "Your cart";

  if (!cart.length) {
    body.innerHTML = `
      <div class="drawer-empty">
        <p>Your cart is empty.</p>
        <a href="/#shop" class="btn btn-lg" data-close>Shop the drop</a>
      </div>`;
    foot.innerHTML = "";
    return;
  }

  const { subtotal, shipping } = totals(cart);
  const qtyByProduct = {};
  for (const l of cart) qtyByProduct[l.id] = (qtyByProduct[l.id] || 0) + l.qty;
  const left = FREE_SHIPPING_OVER - subtotal;
  const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_OVER) * 100));

  body.innerHTML = `
    <div class="ship-progress">
      <p>${left > 0 ? `You're <strong>${formatPrice(left)}</strong> away from free shipping` : `<strong>You've unlocked free shipping</strong>`}</p>
      <div class="ship-bar"><span style="width:${pct}%"></span></div>
    </div>
    <ul class="drawer-lines">
      ${cart
        .map((l) => {
          const p = catalog[l.id];
          const key = escapeHtml(lineKey(l));
          const over = qtyByProduct[l.id] > p.stock;
          const max = Math.min(10, Math.max(1, p.stock));
          return `
          <li class="drawer-line ${lineKey(l) === highlightKey ? "is-new" : ""}">
            <a href="/product?id=${encodeURIComponent(p.id)}" class="drawer-thumb">${thumb(p)}</a>
            <div class="drawer-line-info">
              <a href="/product?id=${encodeURIComponent(p.id)}" class="drawer-line-name">${escapeHtml(p.name)}</a>
              <span class="hint">${l.size ? `Size ${escapeHtml(l.size)} · ` : ""}${formatPrice(p.price)}</span>
              ${over ? `<span class="drawer-warn">${p.stock === 0 ? "Sold out" : `Only ${p.stock} left`}</span>` : ""}
              <div class="stepper" role="group" aria-label="Quantity for ${escapeHtml(p.name)}">
                <button type="button" data-step="-1" data-key="${key}" aria-label="Decrease quantity" ${l.qty <= 1 ? "disabled" : ""}>−</button>
                <span aria-live="polite">${l.qty}</span>
                <button type="button" data-step="1" data-key="${key}" aria-label="Increase quantity" ${l.qty >= max ? "disabled" : ""}>+</button>
              </div>
            </div>
            <div class="drawer-line-end">
              <strong>${formatPrice(p.price * l.qty)}</strong>
              <button type="button" class="drawer-remove" data-remove="${key}">Remove</button>
            </div>
          </li>`;
        })
        .join("")}
    </ul>`;

  foot.innerHTML = `
    <div class="row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
    <div class="row"><span>Shipping</span><span>${shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
    <button type="button" class="btn btn-lg drawer-cta" data-go="checkout">Checkout · ${formatPrice(subtotal + shipping)}</button>
    <p class="hint drawer-note">No payment is taken online.</p>`;
  highlightKey = null;
}

const FIELDS = [
  ["name", "Full name", "name", "text", true, 100, "full"],
  ["email", "Email", "email", "email", true, 254, ""],
  ["phone", "Phone", "tel", "tel", true, 30, ""],
  ["address1", "Street address", "address-line1", "text", true, 200, "full"],
  ["address2", "Apartment, suite, etc. (optional)", "address-line2", "text", false, 200, "full"],
  ["city", "City", "address-level2", "text", true, 100, ""],
  ["postalCode", "Postal code", "postal-code", "text", true, 20, ""],
  ["country", "Country", "country-name", "text", true, 100, "full"],
];

function renderCheckout() {
  const cart = validCart();
  if (!cart.length) {
    view = "bag";
    return render();
  }
  const { subtotal, shipping, total } = totals(cart);
  title.textContent = "Checkout";
  body.innerHTML = `
    <button type="button" class="drawer-back" data-go="bag">← Back to cart</button>
    <form id="drawer-checkout" class="drawer-form" novalidate>
      ${FIELDS.map(
        ([name, label, ac, type, req, max, cls]) => `
        <div class="field ${cls}">
          <label for="dc-${name}">${escapeHtml(label)}</label>
          <input id="dc-${name}" name="${name}" type="${type}" autocomplete="${ac}" maxlength="${max}" ${req ? "required" : ""} value="${escapeHtml(customerDraft[name] || "")}" />
        </div>`
      ).join("")}
    </form>`;
  foot.innerHTML = `
    <div class="row"><span>${cart.reduce((n, l) => n + l.qty, 0)} items</span><span>${formatPrice(subtotal)}</span></div>
    <div class="row"><span>Shipping</span><span>${shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
    <div class="row total"><span>Total</span><span>${formatPrice(total)}</span></div>
    <p class="form-error" id="drawer-error" role="alert"></p>
    <button type="submit" form="drawer-checkout" class="btn btn-lg drawer-cta" id="drawer-place">Place order</button>
    <p class="hint drawer-note">No payment is taken online. We'll contact you to arrange it.</p>`;
  body.querySelector("input")?.focus();
}

async function placeOrder(form) {
  const errorEl = root.querySelector("#drawer-error");
  const button = root.querySelector("#drawer-place");
  errorEl.textContent = "";

  const invalid = [...form.elements].find((el) => el.willValidate && !el.checkValidity());
  if (invalid) {
    invalid.focus();
    errorEl.textContent = `Please check: ${form.querySelector(`label[for="${invalid.id}"]`).textContent.replace(" (optional)", "")}`;
    return;
  }

  button.disabled = true;
  button.textContent = "Placing order…";
  try {
    const order = await api("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: getCart(), customer: Object.fromEntries(new FormData(form)) }),
    });
    saveCart([]);
    customerDraft = {};
    view = "done";
    title.textContent = "Order placed";
    body.innerHTML = `
      <div class="drawer-done">
        <div class="drawer-check" aria-hidden="true">✓</div>
        <h3>Thank you!</h3>
        <p>Order <strong>${escapeHtml(order.orderId)}</strong></p>
        <p>Total ${formatPrice(order.total)}</p>
        <p class="hint">We'll contact you at ${escapeHtml(order.email)} to arrange payment and delivery.</p>
      </div>`;
    foot.innerHTML = `<button type="button" class="btn btn-lg drawer-cta" data-close>Keep shopping</button>`;
  } catch (err) {
    errorEl.textContent = err.message;
    button.disabled = false;
    button.textContent = "Place order";
    // Stock may have changed since the page loaded.
    loadCatalog(true).catch(() => {});
  }
}

export async function openCart({ highlight } = {}) {
  if (!root.classList.contains("open")) lastFocus = document.activeElement;
  if (view === "done") view = "bag";
  if (highlight) {
    highlightKey = highlight;
    view = "bag";
  }
  root.classList.add("open");
  document.documentElement.classList.add("drawer-lock");
  render();
  drawer.focus();
  try {
    await loadCatalog(true);
  } catch {
    body.innerHTML = `<p class="drawer-msg error">Couldn't load your cart. Please try again.</p>`;
    return;
  }
  render();
}

export function closeCart() {
  if (!root.classList.contains("open")) return;
  if (view === "checkout") rememberDraft();
  root.classList.remove("open");
  document.documentElement.classList.remove("drawer-lock");
  if (view === "done") view = "bag";
  lastFocus?.focus?.();
}

function rememberDraft() {
  const form = root.querySelector("#drawer-checkout");
  if (form) customerDraft = Object.fromEntries(new FormData(form));
}

root.addEventListener("click", (e) => {
  const t = e.target.closest("button, a, [data-close]");
  if (!t) return;
  if (t.hasAttribute("data-close")) {
    // Let "Shop the drop" links navigate when on another page.
    if (t.tagName !== "A") e.preventDefault();
    closeCart();
    return;
  }
  if (t.dataset.go) {
    if (view === "checkout") rememberDraft();
    view = t.dataset.go;
    render();
    return;
  }
  if (t.dataset.step) {
    const step = Number(t.dataset.step);
    saveCart(getCart().map((l) => (lineKey(l) === t.dataset.key ? { ...l, qty: Math.max(1, Math.min(10, l.qty + step)) } : l)));
    render();
    return;
  }
  if (t.dataset.remove) {
    const li = t.closest(".drawer-line");
    li?.classList.add("is-leaving");
    setTimeout(() => {
      saveCart(getCart().filter((l) => lineKey(l) !== t.dataset.remove));
      render();
    }, 220);
  }
});

root.addEventListener("submit", (e) => {
  if (e.target.id !== "drawer-checkout") return;
  e.preventDefault();
  placeOrder(e.target);
});

// Esc closes; Tab stays inside the drawer while it's open.
document.addEventListener("keydown", (e) => {
  if (!root.classList.contains("open")) return;
  if (e.key === "Escape") return closeCart();
  if (e.key !== "Tab") return;
  const items = [...drawer.querySelectorAll('button:not([disabled]), a[href], input, [tabindex="0"]')];
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

// Any "Cart" link on the page opens the drawer instead of going to a page.
document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href="/cart"], a[href="/#cart"]');
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  openCart();
});

// Opened from elsewhere: something was added to the cart.
window.addEventListener("cart:added", (e) => openCart({ highlight: `${e.detail.id}|${e.detail.size || ""}` }));

// Links like /#cart (and the old /cart page) open the drawer on arrival.
if (location.hash === "#cart") {
  history.replaceState(null, "", location.pathname + location.search);
  openCart();
}
