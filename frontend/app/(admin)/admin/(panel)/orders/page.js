"use client";
import { useCallback, useEffect, useState } from "react";
import { adminApi, adminJson } from "@/lib/adminApi";
import { Button, dateFmt, moneyFmt, useToast } from "@/components/admin/kit";

export default function Orders() {
  const [status, setStatus] = useState("");
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(null);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, notify] = useToast();

  const load = useCallback(() => {
    adminApi(`/orders${status ? `?status=${status}` : ""}`).then(setList).catch((e) => notify(e.message, true));
  }, [status, notify]);
  useEffect(() => load(), [load]);

  useEffect(() => {
    if (!selected) return;
    adminApi(`/orders/${selected}`).then((d) => setOrder(d.order)).catch((e) => notify(e.message, true));
  }, [selected, notify]);

  async function setTo(next) {
    if (next === "cancelled" && !confirm("Cancel this order? The items go back into stock and this can't be undone.")) return;
    setBusy(true);
    try {
      const d = await adminJson(`/orders/${order.id}`, { status: next }, "PATCH");
      setOrder(d.order);
      load();
      notify(`Order marked ${next}`);
    } catch (e) {
      notify(e.message, true);
    }
    setBusy(false);
  }

  const counts = list?.counts || {};
  const tabs = [["", "All"], ["new", `New (${counts.new ?? 0})`], ["shipped", `Shipped (${counts.shipped ?? 0})`], ["cancelled", `Cancelled (${counts.cancelled ?? 0})`]];

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Orders</h1>
          <p>No payment is taken online, so contact the customer to arrange it, then mark the order shipped.</p>
        </div>
      </div>
      <div className="ad-tabs" role="tablist">
        {tabs.map(([v, label]) => (
          <button key={v} role="tab" aria-selected={status === v} onClick={() => setStatus(v)}>
            {label}
          </button>
        ))}
      </div>
      <div className="ad-split">
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Status</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {list?.orders.map((o) => (
                <tr key={o.id} className={`is-click ${selected === o.id ? "is-active" : ""}`} onClick={() => setSelected(o.id)}>
                  <td>
                    <b>{o.id}</b>
                  </td>
                  <td>{dateFmt(o.created_at)}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.item_count}</td>
                  <td>
                    <span className={`ad-badge ${o.status === "new" ? "warn" : o.status === "shipped" ? "ok" : ""}`}>{o.status}</span>
                  </td>
                  <td className="num">{moneyFmt(o.total)}</td>
                </tr>
              ))}
              {list && !list.orders.length && (
                <tr>
                  <td colSpan={6} className="ad-muted">
                    No orders here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ad-card" style={{ position: "sticky", top: 16 }}>
          {!order || order.id !== selected ? (
            <p className="ad-muted">Select an order to see its details.</p>
          ) : (
            <>
              <h2>
                {order.id} <span className={`ad-badge ${order.status === "new" ? "warn" : order.status === "shipped" ? "ok" : ""}`}>{order.status}</span>
              </h2>
              <dl className="ad-kv">
                <dt>Placed</dt>
                <dd>{dateFmt(order.created_at)}</dd>
                <dt>Customer</dt>
                <dd>{order.customer_name}</dd>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${order.email}`}>{order.email}</a>
                </dd>
                <dt>Phone</dt>
                <dd>{order.phone}</dd>
                <dt>Deliver to</dt>
                <dd>{[order.address_line1, order.address_line2, order.city, order.postal_code, order.country].filter(Boolean).join(", ")}</dd>
                <dt>Account</dt>
                <dd>{order.customer_id ? `Customer #${order.customer_id}` : "Guest"}</dd>
              </dl>
              <div className="ad-tablewrap" style={{ margin: "16px 0" }}>
                <table className="ad-table">
                  <tbody>
                    {order.items.map((it, i) => (
                      <tr key={i}>
                        <td>
                          {it.name}
                          <br />
                          <small className="ad-muted">
                            {it.size ? `Size ${it.size} · ` : ""}
                            {it.qty} × {moneyFmt(it.unit_price)}
                          </small>
                        </td>
                        <td className="num">{moneyFmt(it.line_total)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td>Shipping</td>
                      <td className="num">{order.shipping ? moneyFmt(order.shipping) : "Free"}</td>
                    </tr>
                    <tr>
                      <td>
                        <b>Total</b>
                      </td>
                      <td className="num">
                        <b>{moneyFmt(order.total)}</b>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="ad-actions">
                {order.allowed.includes("shipped") && (
                  <Button variant="primary" busy={busy} onClick={() => setTo("shipped")}>
                    Mark shipped
                  </Button>
                )}
                {order.allowed.includes("new") && (
                  <Button busy={busy} onClick={() => setTo("new")}>
                    Back to new
                  </Button>
                )}
                {order.allowed.includes("cancelled") && (
                  <Button variant="danger" busy={busy} onClick={() => setTo("cancelled")}>
                    Cancel order
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {toast}
    </>
  );
}
