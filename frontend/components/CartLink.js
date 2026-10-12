"use client";
// Any "Cart" link opens the slide-out drawer instead of going to a page.
// Ctrl/Cmd-click still works like a normal link (/cart redirects to the home page
// with the drawer open). Not "/#cart": the smooth-scroll library treats any link
// containing "#" as an in-page anchor and would swallow the click.
import Link from "next/link";
import { useCart } from "./CartProvider";

export default function CartLink({ children, ...props }) {
  const { openCart } = useCart();
  return (
    <Link
      href="/cart"
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
