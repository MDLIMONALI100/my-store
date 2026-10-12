"use client";
import { useCallback, useEffect, useState } from "react";
import { adminApi, adminJson } from "@/lib/adminApi";
import { Button, ImageField, Text, TextArea, Toggle, move, useToast } from "@/components/admin/kit";

const idOf = (url) => (url || "").split("/").pop();

function Row({ item, first, last, onMove, reload, notify }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: item.name, tagline: item.tagline, description: item.description, image: item.image_url || "", hidden: !!item.hidden });
  const [busy, setBusy] = useState(false);
  const set = (p) => setF((c) => ({ ...c, ...p }));

  async function save() {
    setBusy(true);
    try {
      await adminJson(`/categories/${item.id}`, { name: f.name, tagline: f.tagline, description: f.description, image_id: idOf(f.image) || null, hidden: f.hidden }, "PUT");
      notify("Saved");
      reload();
    } catch (e) {
      notify(e.message, true);
    }
    setBusy(false);
  }
  async function remove() {
    if (!confirm(`Delete the category "${item.name}"?`)) return;
    try {
      await adminApi(`/categories/${item.id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      notify(e.message, true);
    }
  }
  return (
    <div className={`ad-item ${item.hidden ? "is-hidden" : ""}`}>
      <div className="ad-item-head">
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ad-thumb" src={item.image_url} alt="" />
        )}
        <div className="grow">
          {item.name}
          <small>/shop/{item.id}</small>
        </div>
        <div className="ad-mini">
          <Button variant="small" disabled={first} onClick={() => onMove(-1)}>↑</Button>
          <Button variant="small" disabled={last} onClick={() => onMove(1)}>↓</Button>
        </div>
        <Button variant="small" onClick={() => setOpen(!open)}>{open ? "Close" : "Edit"}</Button>
      </div>
      {open && (
        <div className="ad-item-body">
          <div className="ad-grid">
            <Text label="Name" value={f.name} onChange={(v) => set({ name: v })} hint="Renaming also renames it on every product" />
            <Text label="Tagline" value={f.tagline} onChange={(v) => set({ tagline: v })} hint="Short line on the home page tile" />
            <TextArea label="Description" value={f.description} onChange={(v) => set({ description: v })} className="full" rows={3} hint="Shown at the top of the category page" />
            <ImageField label="Tile photo" value={f.image} onChange={(v) => set({ image: v })} notify={notify} />
            <Toggle label="Hidden" hint="Not shown in the shop" checked={f.hidden} onChange={(v) => set({ hidden: v })} />
          </div>
          <div className="ad-actions" style={{ marginTop: 14 }}>
            <Button variant="primary" busy={busy} onClick={save}>Save</Button>
            <Button variant="danger" onClick={remove}>Delete</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Categories() {
  const [items, setItems] = useState(null);
  const [name, setName] = useState("");
  const [toast, notify] = useToast();
  const reload = useCallback(() => adminApi("/categories").then((d) => setItems(d.items)).catch((e) => notify(e.message, true)), [notify]);
  useEffect(() => { reload(); }, [reload]);

  async function reorder(i, by) {
    const next = move(items, i, by);
    setItems(next);
    await adminJson("/categories/order", { ids: next.map((c) => c.id) }, "PUT").catch((e) => notify(e.message, true));
  }
  async function add() {
    if (!name.trim()) return;
    try {
      await adminJson("/categories", { name });
      setName("");
      reload();
      notify("Category added");
    } catch (e) {
      notify(e.message, true);
    }
  }

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Categories</h1>
          <p>The groups your products belong to. Each gets its own page and a tile on the home page.</p>
        </div>
      </div>
      <div className="ad-card">
        <div className="ad-toolbar" style={{ margin: 0 }}>
          <input className="ad-search" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button variant="primary" onClick={add}>Add category</Button>
        </div>
      </div>
      <div className="ad-list">
        {items?.map((c, i) => <Row key={c.id} item={c} first={i === 0} last={i === items.length - 1} onMove={(by) => reorder(i, by)} reload={reload} notify={notify} />)}
      </div>
      {toast}
    </>
  );
}
