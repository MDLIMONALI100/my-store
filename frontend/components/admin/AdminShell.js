"use client";
// The admin frame: sign-in check, sidebar and page title area.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  ["/admin", "Dashboard"],
  ["/admin/orders", "Orders"],
  ["/admin/products", "Products"],
  ["/admin/categories", "Categories"],
  ["/admin/home", "Home page"],
  ["/admin/menus", "Menus"],
  ["/admin/pages", "Pages"],
  ["/admin/outfits", "Outfits"],
  ["/admin/reviews", "Reviews"],
  ["/admin/customers", "Customers"],
  ["/admin/inbox", "Inbox"],
  ["/admin/media", "Media"],
  ["/admin/settings", "Settings"],
];

export default function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin-auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => (d.admin ? setReady(true) : router.replace("/admin/login")))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  async function signOut() {
    await fetch("/api/admin-auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    router.replace("/admin/login");
  }

  if (!ready) return <div className="ad-loading">Loading…</div>;
  return (
    <div className="ad-app">
      <aside className={`ad-side ${open ? "open" : ""}`}>
        <div className="ad-brand">
          Admin <span>panel</span>
        </div>
        <nav>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={(href === "/admin" ? pathname === href : pathname.startsWith(href)) ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="ad-side-foot">
          <a href="/" target="_blank" rel="noreferrer">
            View shop ↗
          </a>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="ad-main">
        <header className="ad-topbar">
          <button type="button" className="ad-burger" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
            ☰
          </button>
          <span>Store admin</span>
        </header>
        <main className="ad-content">{children}</main>
      </div>
      {open && <div className="ad-scrim" onClick={() => setOpen(false)} />}
    </div>
  );
}
