"use client";
import { useCallback, useEffect, useState } from "react";
import { adminApi, adminJson } from "@/lib/adminApi";
import { Button, dateFmt, useToast } from "@/components/admin/kit";

export default function Reviews() {
  const [status, setStatus] = useState("pending");
  const [data, setData] = useState(null);
  const [toast, notify] = useToast();
  const load = useCallback(() => adminApi(`/reviews?status=${status}`).then(setData).catch((e) => notify(e.message, true)), [status, notify]);
  useEffect(() => { load(); }, [load]);

  async function setTo(r, next) {
    try {
      await adminJson(`/reviews/${r.id}`, { status: next }, "PATCH");
      notify(next === "approved" ? "Approved: it is now on the product page" : "Moved back to pending");
      load();
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function remove(r) {
    if (!confirm("Delete this review for good?")) return;
    try {
      await adminApi(`/reviews/${r.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      notify(e.message, true);
    }
  }
  const counts = data?.counts || {};
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Reviews</h1>
          <p>New reviews wait here until you approve them. Approved reviews appear on the product page and in its star rating.</p>
        </div>
      </div>
      <div className="ad-tabs" role="tablist">
        <button role="tab" aria-selected={status === "pending"} onClick={() => setStatus("pending")}>Waiting ({counts.pending ?? 0})</button>
        <button role="tab" aria-selected={status === "approved"} onClick={() => setStatus("approved")}>Approved ({counts.approved ?? 0})</button>
      </div>
      <div className="ad-list">
        {data?.reviews.map((r) => (
          <div className="ad-card" key={r.id} style={{ marginBottom: 0 }}>
            <div className="ad-actions" style={{ justifyContent: "space-between" }}>
              <div>
                <span className="ad-star">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span> <b>{r.name}</b>
                <small className="ad-muted"> · {dateFmt(r.createdAt)} · on <a href={`/product/${r.productId}`} target="_blank" rel="noreferrer">{r.productId}</a></small>
              </div>
              <div className="ad-actions">
                {r.status === "pending" ? <Button variant="primary" onClick={() => setTo(r, "approved")}>Approve</Button> : <Button onClick={() => setTo(r, "pending")}>Hide</Button>}
                <Button variant="danger" onClick={() => remove(r)}>Delete</Button>
              </div>
            </div>
            <p style={{ margin: "10px 0 0", whiteSpace: "pre-line" }}>{r.body}</p>
          </div>
        ))}
        {data && !data.reviews.length && <p className="ad-muted">Nothing here.</p>}
      </div>
      {toast}
    </>
  );
}
