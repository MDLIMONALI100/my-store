"use client";
// Full-width search panel under the header. Shows matching products as you type.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/helpers";
import { CloseIcon, SearchIcon } from "./Icons";

export default function SearchOverlay({ open, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null); // { q, products, total } for the latest answer

  // Lock the page, focus the box, close on Esc.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("drawer-lock");
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      root.classList.remove("drawer-lock");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Ask the API 250 ms after the shopper stops typing.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api(`/api/products?q=${encodeURIComponent(term)}&limit=6`)
        .then((d) => !cancelled && setResults({ q: term, products: d.products, total: d.total }))
        .catch(() => !cancelled && setResults({ q: term, products: [], total: 0 }));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  function submit(e) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    onClose();
    router.push(`/shop?q=${encodeURIComponent(term)}`);
  }

  const term = q.trim();
  const showing = term.length >= 2 && results && results.q === term ? results : null;

  return (
    <div className={`search-overlay ${open ? "open" : ""}`} inert={!open}>
      <div className="scrim" onClick={onClose} />
      <div className="search-panel" role="dialog" aria-modal="true" aria-label="Search">
        <form className="container search-form" onSubmit={submit} role="search">
          <SearchIcon />
          <input ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jackets, jeans, boots…" aria-label="Search the store" autoComplete="off" />
          <button type="button" className="icon-btn" aria-label="Close search" onClick={onClose}>
            <CloseIcon />
          </button>
        </form>
        {showing && (
          <div className="container search-results" data-lenis-prevent>
            {showing.products.length ? (
              <>
                <ul>
                  {showing.products.map((p) => (
                    <li key={p.id}>
                      <Link href={`/product/${p.id}`} onClick={onClose}>
                        <span className="search-thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {p.image_url ? <img src={p.image_url} alt="" /> : p.emoji}
                        </span>
                        <span className="search-name">
                          {p.name}
                          <small>
                            {p.category} · {p.color_name}
                          </small>
                        </span>
                        <span className="price">{formatPrice(p.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={`/shop?q=${encodeURIComponent(showing.q)}`} className="link-arrow" onClick={onClose}>
                  View all {showing.total} results
                </Link>
              </>
            ) : (
              <p className="hint">Nothing found for “{showing.q}”. Try “boots”, “chelsea” or “black”.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
