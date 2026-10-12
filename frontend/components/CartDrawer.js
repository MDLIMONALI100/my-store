"use client";
// Slide-out cart. It shows what is in the bag and sends the shopper to the Checkout page.
// (Checkout itself lives on its own page, /checkout.)
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatPrice, parseSizes } from "@/lib/helpers";
import Thumb from "./Thumb";
import { useCart } from "./CartProvider";

const lineKey = (l) => `${l.id}|${l.size}`;

export default function CartDrawer({ freeShippingOver = 5000, shippingFlat = 500 }) {
  const { cart, saveCart, ui, openCart, closeCart } = useCart();
  const { open, highlight, openCount } = ui;

  const [catalog, setCatalog] = useState(null); // id -> product, refreshed each time the drawer opens
  const [loadedFor, setLoadedFor] = useState(-1); // which opening (openCount) the catalog was last refreshed for
  const [loadFailed, setLoadFailed] = useState(false);
  const [leaving, setLeaving] = useState(null);

  const drawerRef = useRef(null);
  const lastFocus = useRef(null);
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart; // must stay above the effect that loads the catalog
  });

  // Asks the API only for the products that are in the cart (not the whole shop).
  const loadCatalog = useCallback(() => {
    const ids = [...new Set(cartRef.current.map((l) => l.id))];
    if (!ids.length) return Promise.resolve().then(() => setCatalog({}));
    return api(`/api/products/by-ids?ids=${ids.map(encodeURIComponent).join(",")}`).then(({ products }) => {
      setCatalog(Object.fromEntries(products.map((p) => [p.id, p])));
      setLoadFailed(false);
    });
  }, []);

  // Fresh stock and prices every time the drawer opens.
  useEffect(() => {
    if (!open) return;
    const n = openCount;
    loadCatalog()
      .then(() => setLoadedFor(n))
      .catch(() => setLoadFailed(true));
  }, [open, openCount, loadCatalog]);

  // Links like /cart (and the old /#cart) open the drawer on arrival.
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

  // Only drop lines once the catalog has been refreshed for this opening, otherwise a
  // product that was just added (and isn't in the old catalog yet) would be removed.
  const fresh = loadedFor === openCount;
  useEffect(() => {
    if (catalog && fresh && lines.length !== cart.length) saveCart(lines);
  }, [catalog, fresh, lines, cart, saveCart]);
  const stale = !fresh && cart.some((l) => !catalog?.[l.id]);

  // Esc closes; Tab stays inside the drawer while it's open.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") return closeCart();
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
  }, [open, closeCart]);

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = catalog ? lines.reduce((s, l) => s + catalog[l.id].price * l.qty, 0) : 0;
  const shipping = subtotal >= freeShippingOver || subtotal === 0 ? 0 : shippingFlat;
  const left = freeShippingOver - subtotal;
  const pct = Math.min(100, Math.round((subtotal / freeShippingOver) * 100));
  const qtyByProduct = {};
  for (const l of lines) qtyByProduct[l.id] = (qtyByProduct[l.id] || 0) + l.qty;

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

  let body;
  let foot = null;
  if (loadFailed) body = <p className="drawer-msg error">Couldn&apos;t load your cart. Please try again.</p>;
  else if (!catalog || stale) body = <p className="drawer-msg">Loading…</p>;
  else if (!lines.length) {
    body = (
      <div className="drawer-empty">
        <p>Your cart is empty.</p>
        <Link href="/shop" className="btn btn-lg" onClick={closeCart}>
          Start shopping
        </Link>
      </div>
    );
  } else {
    body = (
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
            const href = `/product/${p.id}`;
            return (
              <li key={key} className={`drawer-line ${key === highlight ? "is-new" : ""} ${key === leaving ? "is-leaving" : ""}`}>
                <Link href={href} className="drawer-thumb" onClick={closeCart}>
                  <Thumb p={p} />
                </Link>
                <div className="drawer-line-info">
                  <Link href={href} className="drawer-line-name" onClick={closeCart}>
                    {p.name}
                  </Link>
                  <span className="hint">{[p.color_name, l.size && `Size ${l.size}`].filter(Boolean).join(" · ")}</span>
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
        <Link href="/checkout" className="btn btn-lg drawer-cta" onClick={closeCart}>
          Checkout · {formatPrice(subtotal + shipping)}
        </Link>
        <p className="hint drawer-note">No payment is taken online.</p>
      </>
    );
  }

  return (
    <div className={`drawer-root ${open ? "open" : ""}`} inert={!open}>
      <div className="drawer-overlay" onClick={closeCart} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1} ref={drawerRef}>
        <header className="drawer-head">
          <h2 id="drawer-title">{count ? `Your cart (${count})` : "Your cart"}</h2>
          <button type="button" className="drawer-close" onClick={closeCart} aria-label="Close cart">
            ✕
          </button>
        </header>
        <div className="drawer-body" data-lenis-prevent>
          {body}
        </div>
        <footer className="drawer-foot">{foot}</footer>
      </aside>
    </div>
  );
}
