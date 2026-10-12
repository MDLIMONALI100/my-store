"use client";
import { useCallback, useEffect, useState } from "react";
import { adminApi, adminJson } from "@/lib/adminApi";
import { Button, dateFmt, useToast } from "@/components/admin/kit";

export default function Inbox() {
  const [tab, setTab] = useState("messages");
  const [messages, setMessages] = useState(null);
  const [subs, setSubs] = useState(null);
  const [toast, notify] = useToast();
  const load = useCallback(() => {
    adminApi("/messages").then(setMessages).catch((e) => notify(e.message, true));
    adminApi("/subscribers").then((d) => setSubs(d.subscribers)).catch((e) => notify(e.message, true));
  }, [notify]);
  useEffect(() => { load(); }, [load]);

  async function markRead(m, is_read) {
    await adminJson(`/messages/${m.id}`, { is_read }, "PATCH").catch((e) => notify(e.message, true));
    load();
  }
  async function delMessage(m) {
    if (!confirm("Delete this message?")) return;
    await adminApi(`/messages/${m.id}`, { method: "DELETE" }).catch((e) => notify(e.message, true));
    load();
  }
  async function delSub(s) {
    if (!confirm(`Remove ${s.email} from the list?`)) return;
    await adminApi(`/subscribers/${encodeURIComponent(s.email)}`, { method: "DELETE" }).catch((e) => notify(e.message, true));
    load();
  }
  function exportCsv() {
    const csv = "email,subscribed\n" + subs.map((s) => `${s.email},${s.created_at}`).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "subscribers.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Inbox</h1>
          <p>Messages from the contact form and newsletter sign-ups.</p>
        </div>
      </div>
      <div className="ad-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "messages"} onClick={() => setTab("messages")}>Messages ({messages?.unread ?? 0} unread)</button>
        <button role="tab" aria-selected={tab === "subs"} onClick={() => setTab("subs")}>Newsletter ({subs?.length ?? 0})</button>
      </div>
      {tab === "messages" && (
        <div className="ad-list">
          {messages?.messages.map((m) => (
            <div className="ad-card" key={m.id} style={{ marginBottom: 0, borderColor: m.is_read ? undefined : "#161616" }}>
              <div className="ad-actions" style={{ justifyContent: "space-between" }}>
                <div>
                  <b>{m.name}</b> · <a href={`mailto:${m.email}?subject=Re: your message`}>{m.email}</a>
                  <small className="ad-muted"> · {dateFmt(m.created_at)}</small> {!m.is_read && <span className="ad-badge dark">New</span>}
                </div>
                <div className="ad-actions">
                  <Button onClick={() => markRead(m, m.is_read ? 0 : 1)}>{m.is_read ? "Mark unread" : "Mark read"}</Button>
                  <Button variant="danger" onClick={() => delMessage(m)}>Delete</Button>
                </div>
              </div>
              <p style={{ margin: "10px 0 0", whiteSpace: "pre-line" }}>{m.message}</p>
            </div>
          ))}
          {messages && !messages.messages.length && <p className="ad-muted">No messages yet.</p>}
        </div>
      )}
      {tab === "subs" && (
        <>
          <div className="ad-toolbar"><Button onClick={exportCsv} disabled={!subs?.length}>Download CSV</Button></div>
          <div className="ad-tablewrap">
            <table className="ad-table">
              <thead><tr><th>Email</th><th>Subscribed</th><th></th></tr></thead>
              <tbody>
                {subs?.map((s) => (
                  <tr key={s.email}><td>{s.email}</td><td>{dateFmt(s.created_at)}</td><td><Button variant="small danger" onClick={() => delSub(s)}>Remove</Button></td></tr>
                ))}
                {subs && !subs.length && <tr><td colSpan={3} className="ad-muted">No subscribers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      {toast}
    </>
  );
}
