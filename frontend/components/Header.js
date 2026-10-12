"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CATEGORIES, SITE } from "@/lib/helpers";
import { useCart } from "./CartProvider";

const NAV = [["/", "Shop"], ...CATEGORIES.map((c) => [`/?category=${encodeURIComponent(c)}`, c])];

export default function Header() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = pathname + (search ? `?${search}` : "");
  const { count } = useCart();

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
          {/* Opens the slide-out cart in Step 2C */}
          <a href="#cart" className="cart-link" aria-haspopup="dialog">
            Cart <span className="cart-count">{count > 0 ? count : ""}</span>
          </a>
        </div>
      </header>
    </>
  );
}
