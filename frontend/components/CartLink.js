"use client";
// Any "Cart" link opens the slide-out drawer instead of going to a page.
// Ctrl/Cmd-click still works like a normal link (it goes to /#cart).
import Link from "next/link";
import { useCart } from "./CartProvider";

export default function CartLink({ children, ...props }) {
  const { openCart } = useCart();
  return (
    <Link
      href="/#cart"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        openCart();
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
