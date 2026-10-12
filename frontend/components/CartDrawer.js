"use client";
// Slide-out cart. Three views inside one drawer: bag -> checkout form -> order placed.
// Ported from public/cart-drawer.js; same CSS classes, same behavior.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatPrice, parseSizes } from "@/lib/helpers";
import Thumb from "./Thumb";
import { useCart } from "./CartProvider";

const SHIPPING_FLAT = 500;
const FREE_SHIPPING_OVER = 5000;

// [name, label, autocomplete, type, required, maxLength, css class]
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

const lineKey = (l) => `${l.id}|${l.size}`;

export default function CartDrawer() {
  const { cart, saveCart, ui, openCart, closeCart, setView } = useCart();
  const { open, view, highlight, openCount } = ui;

  const [catalog, setCatalog] = useState(null); // id -> product, refreshed each time the drawer opens
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState({}); // keeps typed details if the shopper goes back to the bag
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [leaving, setLeaving] = useState(null);

  const drawerRef = useRef(null);
  const formRef = useRef(null);
  const lastFocus = useRef(null);

  const loadCatalog = useCallback(
    () =>
      api("/api/products").then(({ products }) => {
        setCatalog(Object.fromEntries(products.map((p) => [p.id, p])));
        setLoadFailed(false);
      }),
    []
  );

  // Fresh stock and prices every time the drawer opens.
  useEffect(() => {
    if (open) loadCatalog().catch(() => setLoadFailed(true));
  }, [open, openCount, loadCatalog]);

  // Links like /#cart (and the old /cart page) open the drawer on arrival.
  useEffect(() => {
    if (location.hash === "#cart") {
      history.replaceState(null, "", location.pathname + location.search);
      openCart();
    }
  }, [openCart]);

  // Lock page scroll and manage focus while open.
  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement;
    drawerRef.current?.focus();
    document.documentElement.classList.add("drawer-lock");
    return () => {
      document.documentElement.classList.remove("drawer-lock");
      lastFocus.current?.focus?.();
    };
  }, [open]);

  // Lines whose product or size no longer exists are dropped.
  const lines = useMemo(() => {
    if (!catalog) return [];
    return cart.filter((l) => {
      const p = catalog[l.id];
      if (!p) return false;
      const sizes = parseSizes(p.sizes);
      return sizes.length ? sizes.includes(l.size) : !l.size;
    });
  }, [cart, catalog]);

  useEffect(() => {
    if (catalog && lines.length !== cart.length) saveCart(lines);
  }, [catalog, lines, cart, saveCart]);

  const rememberDraft = useCallback(() => {
    if (view === "checkout" && formRef.current) setDraft(Object.fromEntries(new FormData(formRef.current)));
  }, [view]);

  const close = useCallback(() => {
    rememberDraft();
    closeCart();
  }, [rememberDraft, closeCart]);

  // Esc closes; Tab stays inside the drawer while it's open.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab") return;
      const items = [...drawerRef.current.querySelectorAll('button:not([disabled]), a[href], input, [tabindex="0"]')];
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
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Checkout needs items; if the cart emptied out, show the bag.
  const shownView = view === "checkout" && catalog && !lines.length ? "bag" : view;

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = catalog ? lines.reduce((s, l) => s + catalog[l.id].price * l.qty, 0) : 0;
  const shipping = subtotal >= FREE_SHIPPING_OVER || subtotal === 0 ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

  const title = shownView === "checkout" ? "Checkout" : shownView === "done" ? "Order placed" : count ? `Your cart (${count})` : "Your cart";

  function step(key, by) {
    saveCart(cart.map((l) => (lineKey(l) === key ? { ...l, qty: Math.max(1, Math.min(10, l.qty + by)) } : l)));
  }

  function remove(key) {
    setLeaving(key);
    setTimeout(() => {
      saveCart(cart.filter((l) => lineKey(l) !== key));
      setLeaving(null);
    }, 220);
  }

  async function placeOrder(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setError("");

    const invalid = [...form.elements].find((el) => el.willValidate && !el.checkValidity());
    if (invalid) {
      invalid.focus();
      setError(`Please check: ${form.querySelector(`label[for="${invalid.id}"]`).textContent.replace(" (optional)", "")}`);
      return;
    }

    setPlacing(true);
    try {
      const placed = await api("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines, customer: Object.fromEntries(new FormData(form)) }),
      });
      saveCart([]);
      setDraft({});
      setOrder(placed);
      setView("done");
    } catch (err) {
      setError(err.message);
      loadCatalog().catch(() => {}); // stock may have changed since the page loaded
    } finally {
      setPlacing(false);
    }
  }

  function renderBag() {
    if (!lines.length)
      return (
        <div className="drawer-empty">
          <p>Your cart is empty.</p>
          <Link href="/#shop" className="btn btn-lg" onClick={close}>
            Shop the drop
          </Link>
        </div>
      );

    const qtyByProduct = {};
    for (const l of lines) qtyByProduct[l.id] = (qtyByProduct[l.id] || 0) + l.qty;
    const left = FREE_SHIPPING_OVER - subtotal;
    const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_OVER) * 100));

    return (
      <>
        <div className="ship-progress">
          <p>
            {left > 0 ? (
              <>
                You&apos;re <strong>{formatPrice(left)}</strong> away from free shipping
              </>
            ) : (
              <strong>You&apos;ve unlocked free shipping</strong>
            )}
          </p>
          <div className="ship-bar">
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
        <ul className="drawer-lines">
          {lines.map((l) => {
            const p = catalog[l.id];
            const key = lineKey(l);
            const over = qtyByProduct[l.id] > p.stock;
            const max = Math.min(10, Math.max(1, p.stock));
            const href = `/product?id=${encodeURIComponent(p.id)}`;
            return (
              <li
                key={key}
                className={`drawer-line ${key === highlight ? "is-new" : ""} ${key === leaving ? "is-leaving" : ""}`}
              >
                <Link href={href} className="drawer-thumb" onClick={close}>
                  <Thumb p={p} />
                </Link>
                <div className="drawer-line-info">
                  <Link href={href} className="drawer-line-name" onClick={close}>
                    {p.name}
                  </Link>
                  <span className="hint">
                    {l.size ? `Size ${l.size} · ` : ""}
                    {formatPrice(p.price)}
                  </span>
                  {over && <span className="drawer-warn">{p.stock === 0 ? "Sold out" : `Only ${p.stock} left`}</span>}
                  <div className="stepper" role="group" aria-label={`Quantity for ${p.name}`}>
                    <button type="button" onClick={() => step(key, -1)} aria-label="Decrease quantity" disabled={l.qty <= 1}>
                      −
                    </button>
                    <span aria-live="polite">{l.qty}</span>
                    <button type="button" onClick={() => step(key, 1)} aria-label="Increase quantity" disabled={l.qty >= max}>
                      +
                    </button>
                  </div>
                </div>
                <div className="drawer-line-end">
                  <strong>{formatPrice(p.price * l.qty)}</strong>
                  <button type="button" className="drawer-remove" onClick={() => remove(key)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  let body;
  let foot = null;
  if (loadFailed) {
    body = <p className="drawer-msg error">Couldn&apos;t load your cart. Please try again.</p>;
  } else if (shownView === "done" && order) {
    body = (
      <div className="drawer-done">
        <div className="drawer-check" aria-hidden="true">
          ✓
        </div>
        <h3>Thank you!</h3>
        <p>
          Order <strong>{order.orderId}</strong>
        </p>
        <p>Total {formatPrice(order.total)}</p>
        <p className="hint">We&apos;ll contact you at {order.email} to arrange payment and delivery.</p>
      </div>
    );
    foot = (
      <button type="button" className="btn btn-lg drawer-cta" onClick={close}>
        Keep shopping
      </button>
    );
  } else if (!catalog) {
    body = <p className="drawer-msg">Loading…</p>;
  } else if (shownView === "checkout") {
    body = (
      <>
        <button
          type="button"
          className="drawer-back"
          onClick={() => {
            rememberDraft();
            setView("bag");
          }}
        >
          ← Back to cart
        </button>
        <form id="drawer-checkout" className="drawer-form" ref={formRef} onSubmit={placeOrder} noValidate>
          {FIELDS.map(([name, label, ac, type, req, max, cls]) => (
            <div className={`field ${cls}`} key={name}>
              <label htmlFor={`dc-${name}`}>{label}</label>
              <input
                id={`dc-${name}`}
                name={name}
                type={type}
                autoComplete={ac}
                maxLength={max}
                required={req}
                defaultValue={draft[name] || ""}
                autoFocus={name === "name"}
              />
            </div>
          ))}
        </form>
      </>
    );
    foot = (
      <>
        <div className="row">
          <span>{count} items</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="row">
          <span>Shipping</span>
          <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
        </div>
        <div className="row total">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        <p className="form-error" role="alert">
          {error}
        </p>
        <button type="submit" form="drawer-checkout" className="btn btn-lg drawer-cta" disabled={placing}>
          {placing ? "Placing order…" : "Place order"}
        </button>
        <p className="hint drawer-note">No payment is taken online. We&apos;ll contact you to arrange it.</p>
      </>
    );
  } else {
    body = renderBag();
    if (lines.length)
      foot = (
        <>
          <div className="row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="row">
            <span>Shipping</span>
            <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
          </div>
          <button type="button" className="btn btn-lg drawer-cta" onClick={() => setView("checkout")}>
            Checkout · {formatPrice(total)}
          </button>
          <p className="hint drawer-note">No payment is taken online.</p>
        </>
      );
  }

  return (
    <div className={`drawer-root ${open ? "open" : ""}`} inert={!open}>
      <div className="drawer-overlay" onClick={close} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1} ref={drawerRef}>
        <header className="drawer-head">
          <h2 id="drawer-title">{title}</h2>
          <button type="button" className="drawer-close" onClick={close} aria-label="Close cart">
            ✕
          </button>
        </header>
        <div className="drawer-body">{body}</div>
        <footer className="drawer-foot">{foot}</footer>
      </aside>
    </div>
  );
}
