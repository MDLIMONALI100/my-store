"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CATEGORIES, SITE } from "@/lib/helpers";
import { useCart } from "./CartProvider";
import CartLink from "./CartLink";
import { BagIcon, CloseIcon, MenuIcon } from "./Icons";

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
  const [menuOpen, setMenuOpen] = useState(false);

  // Page scroll is locked while the mobile menu is open; Esc closes it.
  useEffect(() => {
    if (!menuOpen) return;
    const root = document.documentElement;
    root.classList.add("drawer-lock");
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("drawer-lock");
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const items = SITE.announcement.split("|").map((t) => t.trim()).filter(Boolean);
  const repeat = Math.max(4, Math.ceil(12 / items.length));

  const links = (onClick) =>
    NAV.map(([href, label], i) => (
      <Link key={href} href={href} aria-current={href === here ? "page" : undefined} onClick={onClick} style={{ "--i": i }}>
        {label}
      </Link>
    ));

  return (
    <>
      {items.length > 0 && (
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {Array.from({ length: repeat }).flatMap((_, i) =>
              items.flatMap((t, j) => [<span key={`${i}-${j}-t`}>{t}</span>, <span key={`${i}-${j}-s`}>—</span>])
            )}
          </div>
        </div>
      )}
      <header className="site-header">
        <div className="container header-inner">
          <button type="button" className="icon-btn menu-btn" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <MenuIcon />
          </button>
          <nav className="nav" aria-label="Main">
            {links()}
          </nav>
          <Link href="/" className="logo">
            {SITE.store_name}
          </Link>
          <div className="header-actions">
            <CartLink className="icon-btn cart-link" aria-haspopup="dialog" aria-label="Cart">
              <BagIcon />
              {/* key={bump} restarts the little pop animation when the count goes up */}
              <span key={bump} className={`cart-count ${bump ? "bump" : ""}`}>
                {hydrated && count > 0 ? count : ""}
              </span>
            </CartLink>
          </div>
        </div>
      </header>

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`} inert={!menuOpen}>
        <div className="scrim" onClick={() => setMenuOpen(false)} />
        <div className="panel" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="panel-head">
            <span className="logo" style={{ justifySelf: "start", marginLeft: 12 }}>
              {SITE.store_name}
            </span>
            <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="Mobile">{links(() => setMenuOpen(false))}</nav>
        </div>
      </div>
    </>
  );
}
