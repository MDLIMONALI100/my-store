"use client";
import { dateFmt, moneyFmt, useLoad } from "@/components/admin/kit";

export default function Customers() {
  const { data, error } = useLoad("/customers");
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Customers</h1>
          <p>Accounts created on the shop. Guests who check out without an account are not listed here (see Orders).</p>
        </div>
      </div>
      {error && <p className="ad-error">{error}</p>}
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>City</th><th>Joined</th><th className="num">Orders</th><th className="num">Spent</th></tr></thead>
          <tbody>
            {data?.customers.map((c) => (
              <tr key={c.id}>
                <td><b>{c.name}</b></td>
                <td><a href={`mailto:${c.email}`}>{c.email}</a></td>
                <td>{c.phone}</td>
                <td>{[c.city, c.country].filter(Boolean).join(", ")}</td>
                <td>{dateFmt(c.created_at)}</td>
                <td className="num">{c.order_count}</td>
                <td className="num">{moneyFmt(c.spent)}</td>
              </tr>
            ))}
            {data && !data.customers.length && <tr><td colSpan={7} className="ad-muted">No accounts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
