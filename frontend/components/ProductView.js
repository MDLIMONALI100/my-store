"use client";
// The interactive part of the product page: photo gallery with zoom, colour swatches,
// size picker, quantity, add to cart, wishlist and the Details / Materials / Size & Fit tabs.
import Link from "next/link";
import { useState } from "react";
import { formatPrice, isOnSale, parseSizes } from "@/lib/helpers";
import { BagIcon, BoxIcon, CheckIcon, LockIcon, TruckIcon, ZoomIcon } from "./Icons";
import { useCart } from "./CartProvider";
import Stars from "./Stars";
import WishButton from "./WishButton";

const TABS = [
  ["details", "Details"],
  ["materials", "Materials"],
  ["fit", "Size & fit"],
  ["shipping", "Shipping & returns"],
];

export default function ProductView({ p, freeOver }) {
  const { addToCart } = useCart();
  const sizes = parseSizes(p.sizes);
  const inStock = p.stock > 0;
  const gallery = p.gallery.length ? p.gallery : p.image_url ? [p.image_url] : [];
  const detailImage = gallery.length > 1 ? gallery[gallery.length - 1] : null;

  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [sizeError, setSizeError] = useState("");
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("details");

  const maxQty = Math.max(1, Math.min(10, p.stock));
  const sale = isOnSale(p);

  function onAdd() {
    if (sizes.length && !size) {
      setSizeError("Please choose a size first.");
      document.getElementById("pdp-sizes")?.querySelector("button")?.focus();
      return;
    }
    addToCart(p.id, qty, size); // also opens the slide-out cart
  }

  const tabText = {
    details: p.details,
    materials: p.materials,
    fit: p.fit,
    shipping: p.shipping_info,
  };

  return (
    <>
      <section className="pdp">
        <div className="pdp-thumbs" role="group" aria-label="Product photos">
          {gallery.map((url, i) => (
            <button key={url} type="button" className="pdp-thumb" aria-current={i === active ? "true" : undefined} aria-label={`Show photo ${i + 1}`} onClick={() => setActive(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>

        <div
          className={`pdp-main ${zoom ? "zoomed" : ""}`}
          onClick={() => setZoom((z) => !z)}
          onMouseMove={(e) => {
            if (!zoom) return;
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          }}
          onMouseLeave={() => setZoom(false)}
        >
          {gallery[active] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gallery[active]} alt={p.name} style={{ transformOrigin: origin }} fetchPriority="high" />
          ) : (
            <span className="thumb">{p.emoji}</span>
          )}
          <span className="pdp-zoom" aria-hidden="true">
            <ZoomIcon width="20" height="20" />
          </span>
        </div>

        <div className="pdp-info">
          {(p.badge || sale) && <span className="pdp-badge">{sale ? "Sale" : p.badge}</span>}
          <h1 className="pdp-title">{p.name}</h1>
          <a href="#reviews" className="pdp-rating">
            {p.rating_count ? (
              <>
                <Stars rating={p.rating_avg} />
                <span>
                  {p.rating_avg.toFixed(1)} ({p.rating_count} review{p.rating_count === 1 ? "" : "s"})
                </span>
              </>
            ) : (
              <span>No reviews yet · Write the first one</span>
            )}
          </a>

          <p className="pdp-price">
            <span className="now">{formatPrice(p.price)}</span>
            {sale && (
              <>
                <span className="was">{formatPrice(p.compare_at_price)}</span>
                <span className="off">{Math.round((1 - p.price / p.compare_at_price) * 100)}% OFF</span>
              </>
            )}
          </p>
          <p className="pdp-desc">{p.description}</p>

          {p.colors.length > 0 && (
            <>
              <div className="pdp-label">
                <span>
                  Color: <b>{p.color_name}</b>
                </span>
              </div>
              <div className="swatches">
                {p.colors.map((c) => (
                  <Link key={c.id} href={`/product/${c.id}`} className="swatch" aria-current={c.id === p.id ? "true" : undefined} aria-label={c.color_name} title={c.color_name} replace scroll={false}>
                    <i style={{ background: c.color_hex || "#ccc" }} />
                  </Link>
                ))}
              </div>
            </>
          )}

          {sizes.length > 0 && (
            <>
              <div className="pdp-label">
                <span>
                  Size: <b>{size || "Choose a size"}</b>
                </span>
                <Link href="/size-guide">Size guide</Link>
              </div>
              <div className="sizes" id="pdp-sizes" role="group" aria-label="Choose a size">
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

          {p.stock > 0 && p.stock <= 5 && <p className="stock low">Only {p.stock} left</p>}
          {!inStock && <p className="stock out">Sold out</p>}

          <div className="pdp-actions">
            <div className="pdp-qty" role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={!inStock}>
                −
              </button>
              <span aria-live="polite">{qty}</span>
              <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={!inStock}>
                +
              </button>
            </div>
            <button type="button" className="btn btn-lg" onClick={onAdd} disabled={!inStock}>
              <BagIcon /> {inStock ? "Add to cart" : "Sold out"}
            </button>
            <WishButton id={p.id} variant="square" name={p.name} />
          </div>

          <div className="pdp-perks">
            <div>
              <TruckIcon />
              <span>
                <b>Free shipping</b>On orders over {formatPrice(freeOver)}
              </span>
            </div>
            <div>
              <BoxIcon />
              <span>
                <b>Easy returns</b>15-day return policy
              </span>
            </div>
            <div>
              <LockIcon />
              <span>
                <b>No online payment</b>We contact you to arrange it
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="pdp-detail">
        <div>
          <div className="tab-list" role="tablist">
            {TABS.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>
          <div className="tab-panel" role="tabpanel">
            {tabText[tab] && <p>{tabText[tab]}</p>}
            {tab === "details" && p.features.length > 0 && (
              <ul className="feature-list">
                {p.features.map((f) => (
                  <li key={f}>
                    <CheckIcon /> {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {detailImage && (
          <div className="pdp-detail-media" data-reveal="zoom">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={detailImage} alt={`${p.name} close-up`} loading="lazy" />
          </div>
        )}
      </section>
    </>
  );
}
