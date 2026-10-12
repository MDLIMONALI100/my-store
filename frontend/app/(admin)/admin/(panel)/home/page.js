"use client";
import { useCallback, useEffect, useState } from "react";
import { adminApi, adminJson } from "@/lib/adminApi";
import { Button, ImageField, Select, Text, TextArea, Toggle, move, useToast } from "@/components/admin/kit";

const TYPES = {
  hero: "Hero (big banner at the top)",
  categories: "Category tiles",
  product_rail: "Product row",
  banner: "Banner with photo",
  outfits: "Outfit ideas",
  viewer360: "360° outfit viewer",
  perks: "Perks strip (delivery, returns…)",
  newsletter: "Newsletter sign-up",
  text: "Text block",
};
const DEFAULTS = {
  hero: { kicker: "Built for\nthe street.", line1: "Wear it", line2: "loud.", text: "", button: { label: "Shop now", href: "/shop" }, link: { label: "", href: "" }, image: "", tag: "" },
  categories: {},
  product_rail: { title: "Best sellers", subtitle: "", source: "featured", limit: 8, linkLabel: "View all", href: "/shop" },
  banner: { eyebrow: "", title: "New\nvibes", text: "", button: { label: "Shop now", href: "/shop" }, image: "" },
  outfits: { title: "Complete the look", subtitle: "", limit: 4, linkLabel: "All outfits", href: "/outfits" },
  viewer360: { title: "See it from every side", text: "Drag to rotate", caption: "" },
  perks: { items: [{ icon: "truck", title: "Fast delivery", text: "" }] },
  newsletter: { title: "Join the list", text: "", button: "Subscribe" },
  text: { title: "", text: "" },
};
const ICONS = [["truck", "Truck"], ["box", "Box"], ["badge", "Badge"], ["lock", "Lock"]];

// The editing form for each kind of section. d = its data, set(patch) changes it.
function SectionForm({ type, d, set, categories, notify }) {
  const link = (key, label) => (
    <div className="ad-grid full">
      <Text label={`${label} text`} value={d[key]?.label} onChange={(v) => set({ [key]: { ...d[key], label: v } })} />
      <Text label={`${label} link`} value={d[key]?.href} onChange={(v) => set({ [key]: { ...d[key], href: v } })} hint="/shop or https://…" />
    </div>
  );
  if (type === "hero")
    return (
      <div className="ad-grid">
        <TextArea label="Small text (top left)" rows={2} value={d.kicker} onChange={(v) => set({ kicker: v })} />
        <TextArea label="Corner text (on the photo)" rows={2} value={d.tag} onChange={(v) => set({ tag: v })} />
        <Text label="Headline, first line" value={d.line1} onChange={(v) => set({ line1: v })} />
        <Text label="Headline, second line (outlined)" value={d.line2} onChange={(v) => set({ line2: v })} />
        <TextArea label="Intro text" className="full" rows={2} value={d.text} onChange={(v) => set({ text: v })} />
        {link("button", "Button")}
        {link("link", "Text link")}
        <ImageField label="Photo" value={d.image} onChange={(v) => set({ image: v })} notify={notify} hint="Tall photos (4:5) work best" />
      </div>
    );
  if (type === "categories") return <p className="ad-muted" style={{ margin: 0 }}>Shows your categories automatically. Edit them (names, taglines, photos) under Categories.</p>;
  if (type === "product_rail")
    return (
      <div className="ad-grid">
        <Text label="Title" value={d.title} onChange={(v) => set({ title: v })} />
        <Text label="Subtitle" value={d.subtitle} onChange={(v) => set({ subtitle: v })} />
        <Select label="Which products" value={d.source} onChange={(v) => set({ source: v })} options={[["featured", "Featured products"], ["new", "New arrivals"], ["sale", "On sale"], ["category", "One category"], ["manual", "I choose them"]]} />
        <Text label="How many (max 8 shown)" value={d.limit} onChange={(v) => set({ limit: Number(v) || 8 })} inputMode="numeric" />
        {d.source === "category" && <Select label="Category" value={d.category || ""} onChange={(v) => set({ category: v })} options={[["", "Choose…"], ...categories.map((c) => [c.name, c.name])]} />}
        {d.source === "manual" && <TextArea label="Product ids" className="full" rows={2} value={(d.ids || []).join(", ")} onChange={(v) => set({ ids: v.split(/[\s,]+/).filter(Boolean) })} hint="Copy the ids from the product page address, separated by commas" />}
        <Text label="“View all” text" value={d.linkLabel} onChange={(v) => set({ linkLabel: v })} />
        <Text label="“View all” link" value={d.href} onChange={(v) => set({ href: v })} />
      </div>
    );
  if (type === "banner")
    return (
      <div className="ad-grid">
        <Text label="Small label" value={d.eyebrow} onChange={(v) => set({ eyebrow: v })} />
        <TextArea label="Title" rows={2} value={d.title} onChange={(v) => set({ title: v })} hint="Press Enter for a new line" />
        <TextArea label="Text" className="full" rows={3} value={d.text} onChange={(v) => set({ text: v })} />
        {link("button", "Button")}
        <ImageField label="Photo" value={d.image} onChange={(v) => set({ image: v })} notify={notify} />
      </div>
    );
  if (type === "outfits")
    return (
      <div className="ad-grid">
        <Text label="Title" value={d.title} onChange={(v) => set({ title: v })} />
        <Text label="Subtitle" value={d.subtitle} onChange={(v) => set({ subtitle: v })} />
        <Text label="How many" value={d.limit} onChange={(v) => set({ limit: Number(v) || 4 })} inputMode="numeric" />
        <Text label="“All outfits” text" value={d.linkLabel} onChange={(v) => set({ linkLabel: v })} />
        <p className="ad-muted full" style={{ margin: 0 }}>Edit the outfits themselves under Outfits.</p>
      </div>
    );
  if (type === "viewer360")
    return (
      <div className="ad-grid">
        <Text label="Title" value={d.title} onChange={(v) => set({ title: v })} />
        <Text label="Caption" value={d.caption} onChange={(v) => set({ caption: v })} />
        <TextArea label="Text" className="full" rows={2} value={d.text} onChange={(v) => set({ text: v })} />
        <p className="ad-muted full" style={{ margin: 0 }}>The 3D model is set under Settings → 360° viewer.</p>
      </div>
    );
  if (type === "perks")
    return (
      <div className="ad-list">
        {(d.items || []).map((it, i) => (
          <div key={i} className="ad-grid three">
            <Select label="Icon" value={it.icon} onChange={(v) => set({ items: d.items.map((x, j) => (j === i ? { ...x, icon: v } : x)) })} options={ICONS} />
            <Text label="Title" value={it.title} onChange={(v) => set({ items: d.items.map((x, j) => (j === i ? { ...x, title: v } : x)) })} />
            <Text label="Text" value={it.text} onChange={(v) => set({ items: d.items.map((x, j) => (j === i ? { ...x, text: v } : x)) })} />
            <div><Button variant="small danger" onClick={() => set({ items: d.items.filter((_, j) => j !== i) })}>Remove</Button></div>
          </div>
        ))}
        <div><Button onClick={() => set({ items: [...(d.items || []), { icon: "badge", title: "", text: "" }] })}>Add item</Button></div>
      </div>
    );
  if (type === "newsletter")
    return (
      <div className="ad-grid">
        <Text label="Title" value={d.title} onChange={(v) => set({ title: v })} />
        <Text label="Button label (for screen readers)" value={d.button} onChange={(v) => set({ button: v })} />
        <TextArea label="Text" className="full" rows={2} value={d.text} onChange={(v) => set({ text: v })} />
      </div>
    );
  return (
    <div className="ad-grid">
      <Text label="Title" value={d.title} onChange={(v) => set({ title: v })} />
      <TextArea label="Text" className="full" rows={4} value={d.text} onChange={(v) => set({ text: v })} />
    </div>
  );
}

function Section({ s, first, last, onMove, onChange, onSave, onDelete, categories, notify }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className={`ad-item ${s.hidden ? "is-hidden" : ""}`}>
      <div className="ad-item-head">
        <div className="grow">{TYPES[s.type] || s.type}{s.data.title || s.data.line1 ? <small>{(s.data.title || `${s.data.line1} ${s.data.line2 || ""}`).replace(/\n/g, " ")}</small> : null}</div>
        <label className="ad-toggle"><input type="checkbox" checked={!s.hidden} onChange={(e) => { onChange({ hidden: e.target.checked ? 0 : 1 }); }} /><span>Shown</span></label>
        <div className="ad-mini">
          <Button variant="small" disabled={first} onClick={() => onMove(-1)}>↑</Button>
          <Button variant="small" disabled={last} onClick={() => onMove(1)}>↓</Button>
        </div>
        <Button variant="small" onClick={() => setOpen(!open)}>{open ? "Close" : "Edit"}</Button>
      </div>
      {open && (
        <div className="ad-item-body">
          <SectionForm type={s.type} d={s.data} set={(p) => onChange({ data: { ...s.data, ...p } })} categories={categories} notify={notify} />
          <div className="ad-actions" style={{ marginTop: 14 }}>
            <Button variant="primary" busy={busy} onClick={async () => { setBusy(true); await onSave(); setBusy(false); }}>Save section</Button>
            <Button variant="danger" onClick={onDelete}>Delete section</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomeEditor() {
  const [items, setItems] = useState(null);
  const [categories, setCategories] = useState([]);
  const [adding, setAdding] = useState("banner");
  const [toast, notify] = useToast();
  const reload = useCallback(() => adminApi("/home-sections").then((d) => setItems(d.items)).catch((e) => notify(e.message, true)), [notify]);
  useEffect(() => { reload(); adminApi("/categories").then((d) => setCategories(d.items)).catch(() => {}); }, [reload]);

  const patch = (id, p) => setItems((list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)));
  async function save(s) {
    try {
      await adminJson(`/home-sections/${s.id}`, { type: s.type, hidden: s.hidden, data: s.data }, "PUT");
      notify("Saved");
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function reorder(i, by) {
    const next = move(items, i, by);
    setItems(next);
    await adminJson("/home-sections/order", { ids: next.map((s) => s.id) }, "PUT").catch((e) => notify(e.message, true));
  }
  async function add() {
    try {
      await adminJson("/home-sections", { type: adding, data: structuredClone(DEFAULTS[adding]) });
      reload();
      notify("Section added at the bottom");
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function remove(s) {
    if (!confirm("Delete this section from the home page?")) return;
    await adminApi(`/home-sections/${s.id}`, { method: "DELETE" }).catch((e) => notify(e.message, true));
    reload();
  }

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Home page</h1>
          <p>The home page is a stack of sections. Reorder them, hide them or edit what they say. <a href="/" target="_blank" rel="noreferrer">View home page ↗</a></p>
        </div>
      </div>
      <div className="ad-list">
        {items?.map((s, i) => (
          <Section key={s.id} s={s} first={i === 0} last={i === items.length - 1} categories={categories} notify={notify} onChange={(p) => patch(s.id, p)} onMove={(by) => reorder(i, by)} onSave={() => save(s)} onDelete={() => remove(s)} />
        ))}
      </div>
      <div className="ad-card" style={{ marginTop: 18 }}>
        <h2>Add a section</h2>
        <div className="ad-toolbar" style={{ margin: 0 }}>
          <select className="ad-search" value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Section type">
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Button variant="primary" onClick={add}>Add section</Button>
        </div>
      </div>
      {toast}
    </>
  );
}
