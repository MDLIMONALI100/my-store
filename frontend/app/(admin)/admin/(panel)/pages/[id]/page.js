"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { adminApi, adminJson } from "@/lib/adminApi";
import { Button, ImageField, Select, Text, TextArea, Toggle, move, useToast } from "@/components/admin/kit";

const TYPES = [["heading", "Heading"], ["text", "Paragraph"], ["list", "Bullet list"], ["faq", "Questions & answers"], ["image", "Image"], ["button", "Button"], ["contact_form", "Contact form"]];
const BLANK = { heading: { type: "heading", text: "" }, text: { type: "text", text: "" }, list: { type: "list", items: [] }, faq: { type: "faq", items: [{ q: "", a: "" }] }, image: { type: "image", url: "", alt: "" }, button: { type: "button", label: "", href: "/shop" }, contact_form: { type: "contact_form" } };

function Block({ b, onChange, first, last, onMove, onDelete, notify }) {
  const label = TYPES.find(([t]) => t === b.type)?.[1] || b.type;
  return (
    <div className="ad-item">
      <div className="ad-item-head">
        <div className="grow">{label}</div>
        <div className="ad-mini">
          <Button variant="small" disabled={first} onClick={() => onMove(-1)}>↑</Button>
          <Button variant="small" disabled={last} onClick={() => onMove(1)}>↓</Button>
        </div>
        <button type="button" className="ad-x" aria-label="Remove block" onClick={onDelete}>✕</button>
      </div>
      <div className="ad-item-body">
        {b.type === "heading" && <Text label="Heading" value={b.text} onChange={(v) => onChange({ text: v })} />}
        {b.type === "text" && <TextArea label="Paragraph" value={b.text} onChange={(v) => onChange({ text: v })} rows={5} />}
        {b.type === "list" && <TextArea label="Bullet points" hint="One per line" rows={5} value={(b.items || []).join("\n")} onChange={(v) => onChange({ items: v.split("\n") })} />}
        {b.type === "faq" && (
          <div className="ad-list">
            {(b.items || []).map((it, i) => (
              <div key={i} className="ad-grid">
                <Text label="Question" value={it.q} onChange={(v) => onChange({ items: b.items.map((x, j) => (j === i ? { ...x, q: v } : x)) })} />
                <TextArea label="Answer" rows={2} value={it.a} onChange={(v) => onChange({ items: b.items.map((x, j) => (j === i ? { ...x, a: v } : x)) })} />
                <div><Button variant="small danger" onClick={() => onChange({ items: b.items.filter((_, j) => j !== i) })}>Remove question</Button></div>
              </div>
            ))}
            <div><Button onClick={() => onChange({ items: [...(b.items || []), { q: "", a: "" }] })}>Add question</Button></div>
          </div>
        )}
        {b.type === "image" && (
          <div className="ad-grid">
            <ImageField label="Photo" value={b.url} onChange={(v) => onChange({ url: v })} notify={notify} />
            <Text label="Description (for screen readers)" value={b.alt} onChange={(v) => onChange({ alt: v })} />
          </div>
        )}
        {b.type === "button" && (
          <div className="ad-grid">
            <Text label="Button text" value={b.label} onChange={(v) => onChange({ label: v })} />
            <Text label="Link" value={b.href} onChange={(v) => onChange({ href: v })} hint="/shop or https://…" />
          </div>
        )}
        {b.type === "contact_form" && <p className="ad-muted" style={{ margin: 0 }}>Shows the contact form. Messages arrive in Inbox. Your email and phone from Settings appear underneath.</p>}
      </div>
    </div>
  );
}

export default function PageEditor() {
  const { id } = useParams();
  const [f, setF] = useState(null);
  const [adding, setAdding] = useState("text");
  const [busy, setBusy] = useState(false);
  const [toast, notify] = useToast();

  useEffect(() => {
    adminApi(`/pages/${id}`).then(({ item }) => setF({ title: item.title, subtitle: item.subtitle, meta_description: item.meta_description, hidden: !!item.hidden, content: item.content || [] })).catch((e) => notify(e.message, true));
  }, [id, notify]);
  const set = (p) => setF((c) => ({ ...c, ...p }));
  const setBlock = (i, p) => set({ content: f.content.map((b, j) => (j === i ? { ...b, ...p } : b)) });

  async function save() {
    setBusy(true);
    try {
      await adminJson(`/pages/${id}`, { ...f, hidden: f.hidden }, "PUT");
      notify("Saved");
    } catch (e) {
      notify(e.message, true);
    }
    setBusy(false);
  }

  if (!f) return <p className="ad-muted">Loading…</p>;
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>{f.title}</h1>
          <p><Link href="/admin/pages">← All pages</Link> · <a href={`/${id}`} target="_blank" rel="noreferrer">View page ↗</a> · address <span className="ad-code">/{id}</span></p>
        </div>
      </div>
      <div className="ad-card">
        <h2>Page</h2>
        <div className="ad-grid">
          <Text label="Title" value={f.title} onChange={(v) => set({ title: v })} />
          <Text label="Subtitle" value={f.subtitle} onChange={(v) => set({ subtitle: v })} />
          <Text label="Search engine description" value={f.meta_description} onChange={(v) => set({ meta_description: v })} className="full" maxLength={300} />
          <Toggle label="Hidden" hint="Visitors see a 'not found' page" checked={f.hidden} onChange={(v) => set({ hidden: v })} />
        </div>
      </div>
      <div className="ad-card">
        <h2>Content blocks</h2>
        <div className="ad-list">
          {f.content.map((b, i) => (
            <Block key={i} b={b} first={i === 0} last={i === f.content.length - 1} notify={notify} onChange={(p) => setBlock(i, p)} onMove={(by) => set({ content: move(f.content, i, by) })} onDelete={() => set({ content: f.content.filter((_, j) => j !== i) })} />
          ))}
        </div>
        <div className="ad-toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
          <Select label="" value={adding} onChange={setAdding} options={TYPES} />
          <Button onClick={() => set({ content: [...f.content, structuredClone(BLANK[adding])] })}>Add block</Button>
        </div>
      </div>
      <div className="ad-savebar"><Button variant="primary" busy={busy} onClick={save}>Save page</Button></div>
      {toast}
    </>
  );
}
