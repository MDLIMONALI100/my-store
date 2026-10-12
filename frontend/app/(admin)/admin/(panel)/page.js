"use client";
import Link from "next/link";
import { moneyFmt, dateFmt, useLoad } from "@/components/admin/kit";

export default function Dashboard() {
  const { data, error } = useLoad("/stats");
  if (error) return <p className="ad-error">{error}</p>;
  if (!data) return <p className="ad-muted">Loading…</p>;
  const p = data.products;
  const stat = (href, value, label, warn) => (
    <Link href={href} className={`ad-stat ${warn ? "warn" : ""}`}>
      <b>{value}</b>
      <span>{label}</span>
    </Link>
  );
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Dashboard</h1>
          <p>What needs your attention today.</p>
        </div>
      </div>
      <div className="ad-stats">
        {stat("/admin/orders", data.orders.new, "New orders to handle", data.orders.new > 0)}
        {stat("/admin/orders", moneyFmt(data.revenue), `Revenue (${data.paidOrders} orders)`)}
        {stat("/admin/products", p.low_stock + p.out_of_stock, `Low or out of stock (${p.out_of_stock} out)`, p.low_stock + p.out_of_stock > 0)}
        {stat("/admin/reviews", data.reviews ? data.reviews.pending : "–", "Reviews waiting for approval", data.reviews?.pending > 0)}
        {stat("/admin/inbox", data.unreadMessages, "Unread messages", data.unreadMessages > 0)}
        {stat("/admin/customers", data.customers, "Customer accounts")}
        {stat("/admin/inbox", data.subscribers, "Newsletter subscribers")}
        {stat("/admin/products", p.total - p.hidden, `Products in the shop (${p.hidden} hidden)`)}
      </div>
      <div className="ad-card">
        <h2>Recent orders</h2>
        {data.recentOrders.length ? (
          <div className="ad-tablewrap">
            <table className="ad-table">
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href="/admin/orders">{o.id}</Link>
                    </td>
                    <td>{o.customer_name}</td>
                    <td>{dateFmt(o.created_at)}</td>
                    <td>
                      <span className={`ad-badge ${o.status === "new" ? "warn" : o.status === "shipped" ? "ok" : ""}`}>{o.status}</span>
                    </td>
                    <td className="num">{moneyFmt(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ad-muted">No orders yet.</p>
        )}
      </div>
    </>
  );
}
