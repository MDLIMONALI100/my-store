"use client";
// My Account: sign in / create an account, then orders, saved details and password.
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, postJson } from "@/lib/api";
import { formatPrice } from "@/lib/helpers";
import Thumb from "./Thumb";

const dateFmt = (iso) => new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });

function AuthForms({ onDone }) {
  const [error, setError] = useState({ login: "", register: "" });
  const [busy, setBusy] = useState("");

  async function submit(kind, e) {
    e.preventDefault();
    const form = e.currentTarget;
    setError((x) => ({ ...x, [kind]: "" }));
    setBusy(kind);
    try {
      const { customer } = await postJson(`/api/account/${kind}`, Object.fromEntries(new FormData(form)));
      onDone(customer);
    } catch (err) {
      setError((x) => ({ ...x, [kind]: err.message }));
      setBusy("");
    }
  }

  return (
    <div className="auth-grid">
      <section className="auth-card">
        <h2>Sign in</h2>
        <form onSubmit={(e) => submit("login", e)}>
          <div className="field">
            <label htmlFor="li-email">Email</label>
            <input id="li-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="li-pass">Password</label>
            <input id="li-pass" name="password" type="password" autoComplete="current-password" required />
          </div>
          <p className="form-error" role="alert">{error.login}</p>
          <button className="btn btn-lg" type="submit" disabled={busy === "login"}>
            {busy === "login" ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
      <section className="auth-card">
        <h2>Create an account</h2>
        <form onSubmit={(e) => submit("register", e)}>
          <div className="field">
            <label htmlFor="rg-name">Full name</label>
            <input id="rg-name" name="name" autoComplete="name" required maxLength={100} />
          </div>
          <div className="field">
            <label htmlFor="rg-email">Email</label>
            <input id="rg-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="rg-pass">Password (8+ characters)</label>
            <input id="rg-pass" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div className="hp" aria-hidden="true">
            <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <p className="form-error" role="alert">{error.register}</p>
          <button className="btn btn-lg" type="submit" disabled={busy === "register"}>
            {busy === "register" ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="hint">Orders you place while signed in are saved here. You can still check out as a guest.</p>
      </section>
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState(null);
  const [open, setOpen] = useState(null);
  const [detail, setDetail] = useState({});

  useEffect(() => {
    api("/api/account/orders").then((d) => setOrders(d.orders)).catch(() => setOrders([]));
  }, []);

  async function toggle(id) {
    setOpen(open === id ? null : id);
    if (!detail[id]) {
      try {
        const { order } = await api(`/api/account/orders/${id}`);
        setDetail((d) => ({ ...d, [id]: order }));
      } catch {}
    }
  }

  if (!orders) return <p className="hint">Loading…</p>;
  if (!orders.length)
    return (
      <p className="account-empty">
        No orders yet. <Link href="/shop" style={{ textDecoration: "underline" }}>Start shopping</Link>
      </p>
    );
  return orders.map((o) => (
    <div className="order-card" key={o.id}>
      <button type="button" onClick={() => toggle(o.id)} aria-expanded={open === o.id}>
        <span>
          <b>{o.id}</b>
          <small>{dateFmt(o.created_at)} · {o.item_count} item{o.item_count === 1 ? "" : "s"}</small>
        </span>
        <span className={`status ${o.status}`}>{o.status}</span>
        <b>{formatPrice(o.total)}</b>
      </button>
      {open === o.id && (
        <div className="order-detail">
          {detail[o.id] ? (
            <>
              {detail[o.id].items.map((it, i) => (
                <div className="summary-line" key={i}>
                  <Link href={`/product/${it.product_id}`}><Thumb p={{ name: it.name, image_url: it.image_url, emoji: "🛍️", color: "#eef0f4" }} /></Link>
                  <div>
                    <b>{it.name}</b>
                    <dl><dt>Size</dt><dd>{it.size || "–"}</dd><dt>Qty</dt><dd>{it.qty}</dd></dl>
                  </div>
                  <span>{formatPrice(it.line_total)}</span>
                </div>
              ))}
              <div className="summary-totals">
                <div className="row"><span>Shipping</span><span>{detail[o.id].shipping ? formatPrice(detail[o.id].shipping) : "Free"}</span></div>
                <div className="row total" style={{ fontSize: "1.1rem" }}><span>Total</span><span>{formatPrice(detail[o.id].total)}</span></div>
              </div>
              <p className="hint">Delivery to {[detail[o.id].address_line1, detail[o.id].city, detail[o.id].postal_code, detail[o.id].country].filter(Boolean).join(", ")}</p>
            </>
          ) : (
            <p className="hint">Loading…</p>
          )}
        </div>
      )}
    </div>
  ));
}

function Details({ customer, onSaved }) {
  const [msg, setMsg] = useState({ ok: "", error: "" });
  async function save(e) {
    e.preventDefault();
    setMsg({ ok: "", error: "" });
    try {
      const { customer: c } = await postJson("/api/account/me", Object.fromEntries(new FormData(e.currentTarget)), "PATCH");
      onSaved(c);
      setMsg({ ok: "Saved.", error: "" });
    } catch (err) {
      setMsg({ ok: "", error: err.message });
    }
  }
  const f = (name, label, value, cls = "", type = "text") => (
    <div className={`field ${cls}`}>
      <label htmlFor={`ad-${name}`}>{label}</label>
      <input id={`ad-${name}`} name={name} type={type} defaultValue={value || ""} />
    </div>
  );
  return (
    <form className="account-form" onSubmit={save}>
      {f("name", "Full name", customer.name, "full")}
      <div className="field full">
        <label htmlFor="ad-email">Email</label>
        <input id="ad-email" value={customer.email} disabled readOnly />
      </div>
      {f("phone", "Phone", customer.phone, "full", "tel")}
      {f("address_line1", "Street address", customer.address_line1, "full")}
      {f("address_line2", "Apartment, suite, etc.", customer.address_line2, "full")}
      {f("city", "City", customer.city)}
      {f("postal_code", "Postal code", customer.postal_code)}
      {f("country", "Country", customer.country, "full")}
      <p className="form-error full" role="alert" style={{ gridColumn: "1/-1" }}>{msg.error}</p>
      {msg.ok && <p className="hint" style={{ gridColumn: "1/-1", color: "var(--success)" }}>{msg.ok}</p>}
      <button className="btn btn-lg" type="submit">Save details</button>
    </form>
  );
}

function Password() {
  const [msg, setMsg] = useState({ ok: "", error: "" });
  async function save(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setMsg({ ok: "", error: "" });
    try {
      await postJson("/api/account/password", Object.fromEntries(new FormData(form)));
      form.reset();
      setMsg({ ok: "Password changed.", error: "" });
    } catch (err) {
      setMsg({ ok: "", error: err.message });
    }
  }
  return (
    <form className="account-form" onSubmit={save}>
      <div className="field full">
        <label htmlFor="pw-cur">Current password</label>
        <input id="pw-cur" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div className="field full">
        <label htmlFor="pw-new">New password (8+ characters)</label>
        <input id="pw-new" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <p className="form-error" role="alert" style={{ gridColumn: "1/-1" }}>{msg.error}</p>
      {msg.ok && <p className="hint" style={{ gridColumn: "1/-1", color: "var(--success)" }}>{msg.ok}</p>}
      <button className="btn btn-lg" type="submit">Change password</button>
    </form>
  );
}

export default function AccountClient() {
  const [customer, setCustomer] = useState(undefined); // undefined = checking
  const [tab, setTab] = useState("orders");

  useEffect(() => {
    api("/api/account/me").then((d) => setCustomer(d.customer)).catch(() => setCustomer(null));
  }, []);

  async function signOut() {
    await postJson("/api/account/logout", {}).catch(() => {});
    setCustomer(null);
  }

  if (customer === undefined) return <p className="hint">Loading…</p>;
  if (!customer) return <AuthForms onDone={setCustomer} />;

  const TABS = [["orders", "Orders"], ["details", "My details"], ["password", "Password"]];
  return (
    <div className="account-layout">
      <nav className="account-nav" aria-label="Account">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" aria-current={tab === key ? "true" : undefined} onClick={() => setTab(key)}>{label}</button>
        ))}
        <Link href="/wishlist" className="link-under" style={{ marginTop: 14, alignSelf: "flex-start" }}>My wishlist</Link>
        <button type="button" onClick={signOut} style={{ marginTop: 6 }}>Sign out</button>
      </nav>
      <section className="account-panel">
        <h2>{tab === "orders" ? `Hi ${customer.name.split(" ")[0]}, here are your orders` : tab === "details" ? "My details" : "Change password"}</h2>
        {tab === "orders" && <Orders />}
        {tab === "details" && <Details customer={customer} onSaved={setCustomer} />}
        {tab === "password" && <Password />}
      </section>
    </div>
  );
}
