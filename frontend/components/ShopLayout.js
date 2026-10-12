"use client";
// The shop's toolbar and filters. Every change just goes to a new URL (for example
// /shop/boots?size=9&sort=price_asc), and the server draws the matching products,
// so filtered pages can be bookmarked and shared. On phones the filters slide in as a panel.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { shopUrl } from "@/lib/helpers";
import { ChevronIcon, CloseIcon, FilterIcon } from "./Icons";

const SORTS = [
  ["featured", "Featured"],
  ["newest", "Newest"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["popular", "Most popular"],
  ["name_asc", "Name: A to Z"],
];

export default function ShopLayout({ category, params, facets, categories, total, children }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(params.min || "");
  const [maxPrice, setMaxPrice] = useState(params.max || "");

  // On phones the panel locks page scroll while open.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("drawer-lock");
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("drawer-lock");
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The URL for these filters with some values changed (page always goes back to 1).
  const urlFor = (patch, cat = category) => shopUrl(cat, { ...params, page: undefined, ...patch });
  const go = (patch) => startTransition(() => router.push(urlFor(patch), { scroll: false }));

  const active = [
    params.q && ["q", `“${params.q}”`],
    params.size && ["size", `Size ${params.size}`],
    params.color && ["color", params.color],
    (params.min || params.max) && ["price", `$${params.min || 0} – ${params.max ? "$" + params.max : "up"}`],
    params.sale && ["sale", "On sale"],
    params.new && ["new", "New arrivals"],
    params.inStock && ["inStock", "In stock"],
  ].filter(Boolean);
  const removePatch = (key) => (key === "price" ? { min: undefined, max: undefined } : { [key]: undefined });

  const price = facets.price || { min: 0, max: 0 };
  const priceHint = price.max ? `$${Math.floor(price.min / 100)} – $${Math.ceil(price.max / 100)}` : "";

  return (
    <div className={`shop ${pending ? "is-pending" : ""}`}>
      <div className="shop-toolbar">
        <button type="button" className="btn btn-outline filters-btn" onClick={() => setOpen(true)}>
          <FilterIcon width="18" height="18" /> Filters{active.length ? ` (${active.length})` : ""}
        </button>
        <p className="shop-count">
          {total} {total === 1 ? "product" : "products"}
        </p>
        <label className="sort">
          <span className="visually-hidden">Sort by</span>
          <select value={params.sort || "featured"} onChange={(e) => go({ sort: e.target.value === "featured" ? undefined : e.target.value })}>
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronIcon width="16" height="16" />
        </label>
      </div>

      {active.length > 0 && (
        <div className="active-filters">
          {active.map(([key, label]) => (
            <Link key={key} href={urlFor(removePatch(key))} scroll={false} className="chip" aria-label={`Remove filter ${label}`}>
              {label} <CloseIcon width="12" height="12" />
            </Link>
          ))}
          <Link href={shopUrl(category, { sort: params.sort })} scroll={false} className="link-under">
            Clear all
          </Link>
        </div>
      )}

      <div className="shop-body">
        <div className={`filter-panel ${open ? "open" : ""}`}>
          <div className="scrim" onClick={() => setOpen(false)} />
          <aside className="filters-aside" aria-label="Filters" data-lenis-prevent>
            <div className="filters-head">
              <strong>Filters</strong>
              <button type="button" className="icon-btn" aria-label="Close filters" onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </div>

            <details open>
              <summary>Category</summary>
              <ul className="filter-list">
                <li>
                  <Link href={shopUrl("", { ...params, size: undefined, color: undefined, page: undefined })} aria-current={!category ? "true" : undefined} onClick={() => setOpen(false)}>
                    All products
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link href={shopUrl(c.id, { ...params, size: undefined, color: undefined, page: undefined })} aria-current={category === c.id ? "true" : undefined} onClick={() => setOpen(false)}>
                      {c.name} <span>{c.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>

            {facets.sizes?.length > 0 && (
              <details open>
                <summary>Size</summary>
                <div className="filter-chips">
                  {facets.sizes.map((s) => (
                    <button key={s} type="button" className="size-btn" aria-pressed={params.size === s} onClick={() => go({ size: params.size === s ? undefined : s })}>
                      {s}
                    </button>
                  ))}
                </div>
              </details>
            )}

            {facets.colors?.length > 0 && (
              <details open>
                <summary>Color</summary>
                <ul className="filter-list">
                  {facets.colors.map((c) => (
                    <li key={c.name}>
                      <button type="button" className="filter-color" aria-pressed={params.color?.toLowerCase() === c.name.toLowerCase()} onClick={() => go({ color: params.color?.toLowerCase() === c.name.toLowerCase() ? undefined : c.name })}>
                        <i style={{ background: c.hex || "#ccc" }} />
                        {c.name} <span>{c.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <details open>
              <summary>Price {priceHint && <small>{priceHint}</small>}</summary>
              <form
                className="price-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  go({ min: minPrice || undefined, max: maxPrice || undefined });
                }}
              >
                <label>
                  <span className="visually-hidden">Minimum price</span>
                  <input type="number" min="0" inputMode="numeric" placeholder="Min $" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                </label>
                <span>–</span>
                <label>
                  <span className="visually-hidden">Maximum price</span>
                  <input type="number" min="0" inputMode="numeric" placeholder="Max $" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                </label>
                <button className="btn" type="submit">
                  Go
                </button>
              </form>
            </details>

            <details open>
              <summary>Show only</summary>
              <ul className="filter-list">
                {[["sale", "On sale"], ["new", "New arrivals"], ["inStock", "In stock"]].map(([key, label]) => (
                  <li key={key}>
                    <label className="check">
                      <input type="checkbox" checked={!!params[key]} onChange={(e) => go({ [key]: e.target.checked ? "1" : undefined })} />
                      {label}
                    </label>
                  </li>
                ))}
              </ul>
            </details>

            <button type="button" className="btn btn-lg filters-done" onClick={() => setOpen(false)}>
              Show {total} {total === 1 ? "product" : "products"}
            </button>
          </aside>
        </div>

        <div className="shop-results">{children}</div>
      </div>
    </div>
  );
}
