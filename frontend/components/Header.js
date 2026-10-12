"use client";
// Announcement bar + sticky header: menu on the left, logo in the middle, icons on the right.
// The menu items and store name come from the admin (passed in by the layout).
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";
import CartLink from "./CartLink";
import SearchOverlay from "./SearchOverlay";
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "./Icons";

// false while the server renders and during hydration, true afterwards. The cart and
// wishlist only exist in the browser, so their badge numbers wait for this.
const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

export default function Header({ storeName, announcement, showAnnouncement, items }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = pathname + (search ? `?${search}` : "");
  const { count, bump } = useCart();
  const wish = useWishlist();
  const hydrated = useHydrated();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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

  const messages = (announcement || "").split("|").map((t) => t.trim()).filter(Boolean);
  const repeat = Math.max(4, Math.ceil(12 / Math.max(messages.length, 1)));
  const isCurrent = (href) => href === here || (href !== "/" && !href.includes("?") && pathname === href);

  const links = (onClick) =>
    items.map((item, i) => (
      <Link key={item.id} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} onClick={onClick} style={{ "--i": i }}>
        {item.label}
      </Link>
    ));

  return (
    <>
      {showAnnouncement && messages.length > 0 && (
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {Array.from({ length: repeat }).flatMap((_, i) =>
              messages.flatMap((t, j) => [<span key={`${i}-${j}-t`}>{t}</span>, <span key={`${i}-${j}-s`}>—</span>])
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
            {storeName}
          </Link>
          <div className="header-actions">
            <button type="button" className="icon-btn" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <SearchIcon />
            </button>
            <Link href="/account" className="icon-btn" aria-label="My account">
              <UserIcon />
            </Link>
            <Link href="/wishlist" className="icon-btn icon-wish" aria-label="Wishlist">
              <HeartIcon />
              <span className="cart-count">{hydrated && wish.count > 0 ? wish.count : ""}</span>
            </Link>
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
              {storeName}
            </span>
            <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="Mobile">
            {links(() => setMenuOpen(false))}
            <Link href="/account" onClick={() => setMenuOpen(false)} style={{ "--i": items.length }}>
              My account
            </Link>
          </nav>
        </div>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
