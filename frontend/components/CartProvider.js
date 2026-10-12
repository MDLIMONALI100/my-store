"use client";
// Cart state for the whole site.
// - The cart itself lives in localStorage ({ id, size, qty } lines), same format as the
//   old site, so a cart started there still works. useSyncExternalStore keeps React in
//   sync with it (including other open tabs).
// - Whether the slide-out drawer is open, and which view it shows, lives here too so
//   any component (Add to cart button, header link) can open it.
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";

const CART_KEY = "my-store-cart";
const EMPTY = "[]";
const listeners = new Set();

function subscribe(cb) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
const getSnapshot = () => {
  try {
    return localStorage.getItem(CART_KEY) || EMPTY;
  } catch {
    return EMPTY;
  }
};
const getServerSnapshot = () => EMPTY;

function parse(raw) {
  try {
    return (JSON.parse(raw) || []).map((l) => ({ id: l.id, size: l.size || "", qty: l.qty }));
  } catch {
    return [];
  }
}
const countOf = (cart) => cart.reduce((n, l) => n + l.qty, 0);

function write(next) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const cart = useMemo(() => parse(raw), [raw]);
  const [bump, setBump] = useState(0); // changes when the item count goes up (badge animation)
  const [ui, setUi] = useState({ open: false, view: "bag", highlight: null, openCount: 0 });

  const openCart = useCallback(
    ({ highlight = null } = {}) =>
      setUi((u) => ({
        open: true,
        view: highlight || u.view === "done" ? "bag" : u.view,
        highlight,
        openCount: u.openCount + 1,
      })),
    []
  );
  const closeCart = useCallback(
    () => setUi((u) => ({ ...u, open: false, highlight: null, view: u.view === "done" ? "bag" : u.view })),
    []
  );
  const setView = useCallback((view) => setUi((u) => ({ ...u, view, highlight: null })), []);

  const saveCart = useCallback((next) => {
    if (countOf(next) > countOf(parse(getSnapshot()))) setBump((b) => b + 1);
    write(next);
  }, []);

  const addToCart = useCallback(
    (id, qty = 1, size = "") => {
      const next = parse(getSnapshot());
      const line = next.find((l) => l.id === id && l.size === size);
      if (line) line.qty = Math.min(line.qty + qty, 10);
      else next.push({ id, size, qty: Math.min(qty, 10) });
      saveCart(next);
      openCart({ highlight: `${id}|${size}` });
    },
    [saveCart, openCart]
  );

  const value = { cart, count: countOf(cart), bump, saveCart, addToCart, ui, openCart, closeCart, setView };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
