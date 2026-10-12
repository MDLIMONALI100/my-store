"use client";
// The cart lives in localStorage ({ id, size, qty } lines), same format as the old
// site, so a cart started on the old site still works here.
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const CART_KEY = "my-store-cart";
const CartContext = createContext(null);

function readCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    return cart.map((l) => ({ id: l.id, size: l.size || "", qty: l.qty }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  // Read localStorage after the first render (it doesn't exist on the server).
  useEffect(() => setCart(readCart()), []);

  const save = useCallback((next) => {
    setCart(next);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const addToCart = useCallback(
    (id, qty = 1, size = "") => {
      const next = readCart();
      const line = next.find((l) => l.id === id && l.size === size);
      if (line) line.qty = Math.min(line.qty + qty, 10);
      else next.push({ id, size, qty: Math.min(qty, 10) });
      save(next);
    },
    [save]
  );

  const count = cart.reduce((n, l) => n + l.qty, 0);

  return <CartContext.Provider value={{ cart, count, save, addToCart }}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
