"use client";
// "Shop the look": pick a size for each piece and add the whole outfit to the cart.
import Link from "next/link";
import { useState } from "react";
import { formatPrice, parseSizes } from "@/lib/helpers";
import { BagIcon } from "./Icons";
import { useCart } from "./CartProvider";
import Thumb from "./Thumb";

export default function OutfitBuy({ items }) {
  const { addToCart } = useCart();
  const [sizes, setSizes] = useState(() => Object.fromEntries(items.map((p) => [p.id, parseSizes(p.sizes).length === 1 ? parseSizes(p.sizes)[0] : ""])));
  const [error, setError] = useState("");
  const available = items.filter((p) => p.stock > 0);
  const total = available.reduce((s, p) => s + p.price, 0);

  function addAll() {
    const missing = available.find((p) => parseSizes(p.sizes).length && !sizes[p.id]);
    if (missing) return setError(`Please choose a size for ${missing.name}.`);
    setError("");
    for (const p of available) addToCart(p.id, 1, sizes[p.id] || "");
  }

  return (
    <>
      <ul className="look-items">
        {items.map((p) => (
          <li key={p.id}>
            <Link href={`/product/${p.id}`}>
              <Thumb p={p} />
            </Link>
            <div>
              <Link href={`/product/${p.id}`}>{p.name}</Link>
              <small>{[p.color_name, p.stock === 0 && "Sold out"].filter(Boolean).join(" · ")}</small>
              {p.stock > 0 && parseSizes(p.sizes).length > 1 && (
                <div className="look-sizes" role="group" aria-label={`Size for ${p.name}`}>
                  {parseSizes(p.sizes).map((s) => (
                    <button key={s} type="button" className="size-btn" aria-pressed={sizes[p.id] === s} onClick={() => setSizes((cur) => ({ ...cur, [p.id]: s }))}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="price">{formatPrice(p.price)}</span>
          </li>
        ))}
      </ul>
      <div className="look-total">
        <span>Total</span>
        <span>{formatPrice(total)}</span>
      </div>
      <p className="form-error" role="alert">
        {error}
      </p>
      <button type="button" className="btn btn-lg" style={{ width: "100%" }} onClick={addAll} disabled={!available.length}>
        <BagIcon width="20" height="20" /> Add the whole look to cart
      </button>
    </>
  );
}
