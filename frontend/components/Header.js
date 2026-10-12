"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CATEGORIES, SITE } from "@/lib/helpers";
import { useCart } from "./CartProvider";
import CartLink from "./CartLink";

const NAV = [["/", "Shop"], ...CATEGORIES.map((c) => [`/?category=${encodeURIComponent(c)}`, c])];

// false while the server renders and during hydration, true afterwards. The cart
// only exists in the browser, so the badge number waits for this.
const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

export default function Header() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = pathname + (search ? `?${search}` : "");
  const { count, bump } = useCart();
  const hydrated = useHydrated();

  const items = SITE.announcement.split("|").map((t) => t.trim()).filter(Boolean);
  const repeat = Math.max(4, Math.ceil(12 / items.length));

  return (
    <>
      {items.length > 0 && (
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {Array.from({ length: repeat }).flatMap((_, i) =>
              items.flatMap((t, j) => [<span key={`${i}-${j}-t`}>{t}</span>, <span key={`${i}-${j}-s`}>★</span>])
            )}
          </div>
        </div>
      )}
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="logo">
            {SITE.store_name}
            <span className="logo-dot">.</span>
          </Link>
          <nav className="nav" aria-label="Main">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} aria-current={href === here ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          <CartLink className="cart-link" aria-haspopup="dialog">
            {/* key={bump} restarts the little pop animation when the count goes up */}
            Cart{" "}
            <span key={bump} className={`cart-count ${bump ? "bump" : ""}`}>
              {hydrated && count > 0 ? count : ""}
            </span>
          </CartLink>
        </div>
      </header>
    </>
  );
}
