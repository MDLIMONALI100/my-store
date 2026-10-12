"use client";
// The wishlist is a list of product ids kept in this browser (localStorage), the same
// pattern as the cart. It works without signing in.
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

const KEY = "my-store-wishlist";
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
    return localStorage.getItem(KEY) || EMPTY;
  } catch {
    return EMPTY;
  }
};
const getServerSnapshot = () => EMPTY;
const parse = (raw) => {
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((x) => typeof x === "string").slice(0, 200) : [];
  } catch {
    return [];
  }
};

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ids = useMemo(() => parse(raw), [raw]);

  const toggle = useCallback((id) => {
    const current = parse(getSnapshot());
    const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    listeners.forEach((l) => l());
  }, []);

  return <WishlistContext.Provider value={{ ids, count: ids.length, toggle }}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
