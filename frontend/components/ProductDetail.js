"use client";
// Size picker, quantity and "Add to cart" (the interactive part of the product page).
import { useState } from "react";
import { formatPrice, parseSizes } from "@/lib/helpers";
import Stars from "./Stars";
import Thumb from "./Thumb";
import { useCart } from "./CartProvider";

export default function ProductDetail({ p }) {
  const { addToCart } = useCart();
  const sizes = parseSizes(p.sizes);
  const inStock = p.stock > 0;
  const stockClass = !inStock ? "out" : p.stock <= 5 ? "low" : "in";
  const stockText = !inStock ? "Sold out" : p.stock <= 5 ? `Only ${p.stock} left` : "In stock";

  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [sizeError, setSizeError] = useState("");
  const [qty, setQty] = useState("1");

  function onAdd(e) {
    if (sizes.length && !size) {
      setSizeError("Please choose a size first.");
      e.currentTarget.closest(".product-info").querySelector(".size-btn")?.focus();
      return;
    }
    const n = Math.max(1, Math.min(10, parseInt(qty, 10) || 1));
    addToCart(p.id, n, size); // also opens the slide-out cart
  }

  return (
    <section className="product">
      <Thumb p={p} />
      <div className="product-info">
        <span className="category">{p.category}</span>
        <h1>{p.name}</h1>
        <p className="price">{formatPrice(p.price)}</p>
        <a href="#reviews" className="rating-link">
          {p.rating_count ? (
            <>
              <Stars rating={p.rating_avg} />{" "}
              <span>
                {p.rating_avg.toFixed(1)} · {p.rating_count} review{p.rating_count === 1 ? "" : "s"}
              </span>
            </>
          ) : (
            <span>No reviews yet · Write the first one</span>
          )}
        </a>
        <p className={`stock ${stockClass}`}>{stockText}</p>
        <p className="desc">{p.description}</p>

        {sizes.length > 0 && (
          <>
            <div className="size-label">
              Size <span>{size ? `Selected: ${size}` : "Choose a size"}</span>
            </div>
            <div className="sizes" role="group" aria-label="Choose a size">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="size-btn"
                  aria-pressed={s === size}
                  disabled={!inStock}
                  onClick={() => {
                    setSize(s);
                    setSizeError("");
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="size-error" role="alert">
              {sizeError}
            </p>
          </>
        )}

        <div className="qty-row">
          <label htmlFor="qty" className="visually-hidden">
            Quantity
          </label>
          <input
            id="qty"
            className="qty"
            type="number"
            min="1"
            max={Math.max(1, Math.min(10, p.stock))}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            disabled={!inStock}
          />
          <button className="btn btn-lg" onClick={onAdd} disabled={!inStock}>
            {inStock ? "Add to cart" : "Sold out"}
          </button>
        </div>

        <ul className="perks">
          <li>
            <strong>Free shipping</strong> on orders over $50
          </li>
          <li>
            <strong>No payment online.</strong> We&apos;ll contact you to arrange it.
          </li>
        </ul>
      </div>
    </section>
  );
}
