"use client";
// The Checkout page: customer details on the left, the bag and totals on the right.
// Prices are shown here for convenience, but the server recalculates everything
// when the order is placed.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, postJson } from "@/lib/api";
import { formatPrice, parseSizes } from "@/lib/helpers";
import { useCart } from "./CartProvider";
import Thumb from "./Thumb";

const FIELDS = [
  ["name", "Full name", "name", "text", true, 100, "full"],
  ["email", "Email", "email", "email", true, 254, ""],
  ["phone", "Phone", "tel", "tel", true, 30, ""],
  ["country", "Country / Region", "country-name", "text", true, 100, ""],
  ["city", "City", "address-level2", "text", true, 100, ""],
  ["address1", "Street address", "address-line1", "text", true, 200, "full"],
  ["address2", "Apartment, suite, etc. (optional)", "address-line2", "text", false, 200, "full"],
  ["postalCode", "Zip / Postal code", "postal-code", "text", true, 20, ""],
];

export default function CheckoutClient({ freeShippingOver, shippingFlat }) {
  const router = useRouter();
  const { cart, saveCart } = useCart();
  const formRef = useRef(null);
  const [catalog, setCatalog] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [customer, setCustomer] = useState(undefined); // undefined = still checking, null = guest
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [agree, setAgree] = useState(false);

  // Product details (names, photos, current prices and stock) for what is in the cart.
  const idsKey = [...new Set(cart.map((l) => l.id))].sort().join(",");
  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    api(`/api/products/by-ids?ids=${idsKey.split(",").map(encodeURIComponent).join(",")}`)
      .then(({ products }) => !cancelled && setCatalog(Object.fromEntries(products.map((p) => [p.id, p]))))
      .catch(() => !cancelled && setLoadFailed(true));
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  // Signed-in customers get their saved details filled in.
  useEffect(() => {
    api("/api/account/me")
      .then(({ customer: c }) => setCustomer(c))
      .catch(() => setCustomer(null));
  }, []);
  const saved = customer
    ? { name: customer.name, email: customer.email, phone: customer.phone, country: customer.country, city: customer.city, address1: customer.address_line1, address2: customer.address_line2, postalCode: customer.postal_code }
    : {};

  const lines = useMemo(() => {
    if (!catalog) return [];
    return cart.filter((l) => {
      const p = catalog[l.id];
      if (!p) return false;
      const sizes = parseSizes(p.sizes);
      return sizes.length ? sizes.includes(l.size) : !l.size;
    });
  }, [cart, catalog]);

  const subtotal = lines.reduce((s, l) => s + catalog[l.id].price * l.qty, 0);
  const shipping = subtotal >= freeShippingOver || subtotal === 0 ? 0 : shippingFlat;
  const total = subtotal + shipping;
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);

  async function placeOrder(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setError("");
    const invalid = [...form.elements].find((el) => el.willValidate && !el.checkValidity());
    if (invalid) {
      invalid.focus();
      const label = form.querySelector(`label[for="${invalid.id}"]`);
      setError(label ? `Please check: ${label.textContent.replace(" (optional)", "")}` : "Please check the form.");
      return;
    }
    if (!agree) return setError("Please agree to the data processing note to continue.");

    setPlacing(true);
    try {
      const order = await postJson("/api/checkout", { items: lines, customer: Object.fromEntries(new FormData(form)) });
      try {
        sessionStorage.setItem("last-order", JSON.stringify(order));
      } catch {}
      saveCart([]);
      router.push("/checkout/success");
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  }

  if (!cart.length) {
    return (
      <div className="co-empty">
        <p className="display">Your cart is empty</p>
        <Link href="/shop" className="btn btn-lg">
          Start shopping
        </Link>
      </div>
    );
  }
  if (loadFailed) return <p className="message error">Couldn&apos;t load your cart. Please refresh the page.</p>;
  if (!catalog || customer === undefined) return <p className="message">Loading…</p>;
  if (!lines.length) {
    return (
      <div className="co-empty">
        <p className="display">Items unavailable</p>
        <p className="hint">Some items in your cart are no longer available.</p>
        <Link href="/shop" className="btn btn-lg">
          Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <form className="checkout-grid" onSubmit={placeOrder} noValidate ref={formRef}>
      <div>
        {!customer && (
          <p className="co-signin">
            Already have an account? <Link href="/account">Sign in</Link> to fill in your details and see this order in My Account.
          </p>
        )}
        <section className="co-section">
          <h2>Your details</h2>
          <div className="co-fields">
            {FIELDS.map(([name, label, ac, type, req, max, cls]) => (
              <div className={`field ${cls}`} key={name}>
                <label htmlFor={`co-${name}`}>{label}</label>
                <input id={`co-${name}`} name={name} type={type} autoComplete={ac} maxLength={max} required={req} defaultValue={saved[name] || ""} />
              </div>
            ))}
          </div>
        </section>

        <section className="co-section">
          <h2>Delivery</h2>
          <label className="radio-card">
            <input type="radio" name="delivery" checked readOnly />
            <span>
              Standard delivery
              <small>Delivery within 3–7 working days</small>
            </span>
            <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
          </label>
          <p className="hint">Free shipping on orders over {formatPrice(freeShippingOver)}.</p>
        </section>

        <section className="co-section">
          <h2>Payment</h2>
          <div className="pay-note">
            <strong>No payment is taken online.</strong>
            Place your order and we will contact you to arrange payment and delivery.
          </div>
          <label className="check" style={{ marginTop: 22 }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              I agree to the processing of my data for this order (see the <Link href="/privacy" style={{ textDecoration: "underline" }}>privacy policy</Link>).
            </span>
          </label>
        </section>
      </div>

      <aside className="summary">
        <h2>
          Shopping bag ({itemCount})
        </h2>
        {lines.map((l) => {
          const p = catalog[l.id];
          return (
            <div className="summary-line" key={`${l.id}|${l.size}`}>
              <Link href={`/product/${p.id}`}>
                <Thumb p={p} />
              </Link>
              <div>
                <b>{p.name}</b>
                <dl>
                  {l.size && (
                    <>
                      <dt>Size</dt>
                      <dd>{l.size}</dd>
                    </>
                  )}
                  {p.color_name && (
                    <>
                      <dt>Color</dt>
                      <dd>{p.color_name}</dd>
                    </>
                  )}
                  <dt>Quantity</dt>
                  <dd>{l.qty}</dd>
                </dl>
              </div>
              <span>{formatPrice(p.price * l.qty)}</span>
            </div>
          );
        })}
        <div className="summary-totals">
          <div className="row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="row">
            <span>Shipping</span>
            <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
          </div>
          <div className="row total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
        <p className="form-error" role="alert">
          {error}
        </p>
        <button type="submit" className="btn btn-lg co-submit" disabled={placing}>
          {placing ? "Placing order…" : "Place order"}
        </button>
      </aside>
    </form>
  );
}
