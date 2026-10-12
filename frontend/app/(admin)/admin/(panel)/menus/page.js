"use client";
import { useCallback, useEffect, useState } from "react";
import { adminApi, adminJson } from "@/lib/adminApi";
import { Button, move, useToast } from "@/components/admin/kit";

const LOCATIONS = [["header", "Header menu", "Shown at the top of every page (and the mobile menu)"], ["footer_shop", "Footer: Shop", "First footer column"], ["footer_info", "Footer: Info", "Second footer column (About, FAQ, ...)"]];

function MenuItem({ item, first, last, onMove, onChange, onSave, onDelete }) {
  return (
    <div className={`ad-item ${item.hidden ? "is-hidden" : ""}`}>
      <div className="ad-item-head">
        <input className="ad-search" style={{ maxWidth: 170 }} value={item.label} onChange={(e) => onChange({ label: e.target.value })} aria-label="Label" />
        <input className="ad-search" style={{ maxWidth: 260 }} value={item.href} onChange={(e) => onChange({ href: e.target.value })} aria-label="Link" placeholder="/shop" />
        <label className="ad-toggle"><input type="checkbox" checked={!item.hidden} onChange={(e) => onChange({ hidden: e.target.checked ? 0 : 1 })} /><span>Shown</span></label>
        <div className="grow" />
        <div className="ad-mini">
          <Button variant="small" disabled={first} onClick={() => onMove(-1)}>↑</Button>
          <Button variant="small" disabled={last} onClick={() => onMove(1)}>↓</Button>
        </div>
        <Button variant="small primary" onClick={onSave}>Save</Button>
        <button type="button" className="ad-x" aria-label="Delete" onClick={onDelete}>✕</button>
      </div>
    </div>
  );
}

export default function Menus() {
  const [items, setItems] = useState(null);
  const [toast, notify] = useToast();
  const reload = useCallback(() => adminApi("/menus").then((d) => setItems(d.items)).catch((e) => notify(e.message, true)), [notify]);
  useEffect(() => { reload(); }, [reload]);

  const inLoc = (loc) => items.filter((m) => m.location === loc);
  const patch = (id, p) => setItems((list) => list.map((m) => (m.id === id ? { ...m, ...p } : m)));

  async function save(m) {
    try {
      await adminJson(`/menus/${m.id}`, { label: m.label, href: m.href, hidden: m.hidden }, "PUT");
      notify("Saved");
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function reorder(loc, i, by) {
    const list = move(inLoc(loc), i, by);
    setItems((all) => [...all.filter((m) => m.location !== loc), ...list]);
    await adminJson("/menus/order", { ids: list.map((m) => m.id) }, "PUT").catch((e) => notify(e.message, true));
    reload();
  }
  async function add(loc) {
    try {
      await adminJson("/menus", { location: loc, label: "New link", href: "/shop" });
      reload();
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function remove(m) {
    if (!confirm(`Remove "${m.label}" from the menu?`)) return;
    await adminApi(`/menus/${m.id}`, { method: "DELETE" }).catch((e) => notify(e.message, true));
    reload();
  }

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Menus</h1>
          <p>Links must start with / (a page on your shop, like /shop/boots) or https:// (another website).</p>
        </div>
      </div>
      {items &&
        LOCATIONS.map(([loc, title, hint]) => (
          <div className="ad-card" key={loc}>
            <h2>{title} <small>{hint}</small></h2>
            <div className="ad-list">
              {inLoc(loc).map((m, i, arr) => (
                <MenuItem key={m.id} item={m} first={i === 0} last={i === arr.length - 1} onMove={(by) => reorder(loc, i, by)} onChange={(p) => patch(m.id, p)} onSave={() => save(m)} onDelete={() => remove(m)} />
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <Button onClick={() => add(loc)}>Add link</Button>
            </div>
          </div>
        ))}
      {toast}
    </>
  );
}
