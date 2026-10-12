"use client";
// The wishlist page: the saved ids are in this browser; the API supplies the product details.
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ProductCard from "./ProductCard";
import { useWishlist } from "./WishlistProvider";

export default function WishlistClient() {
  const { ids } = useWishlist();
  const key = ids.join(",");
  const [state, setState] = useState({ key: "", products: [] });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    api(`/api/products/by-ids?ids=${key.split(",").map(encodeURIComponent).join(",")}`)
      .then((d) => !cancelled && setState({ key, products: d.products }))
      .catch(() => !cancelled && setState({ key, products: [] }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!ids.length)
    return (
      <div className="empty-shop">
        <p className="display">Nothing saved yet</p>
        <p className="hint">Tap the heart on any product to save it here.</p>
        <Link href="/shop" className="btn btn-lg">Browse the shop</Link>
      </div>
    );
  if (state.key !== key) return <p className="hint">Loading…</p>;
  const byId = new Map(state.products.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean); // newest saved first
  return (
    <div className="wish-grid">
      {ordered.map((p, i) => (
        <ProductCard key={p.id} p={p} index={i} columns={3} />
      ))}
    </div>
  );
}
