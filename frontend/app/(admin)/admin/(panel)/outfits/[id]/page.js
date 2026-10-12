"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { adminApi, adminJson } from "@/lib/adminApi";
import { Button, ImageField, Text, TextArea, Toggle, move, moneyFmt, useToast } from "@/components/admin/kit";

const idOf = (url) => (url || "").split("/").pop();

export default function OutfitEditor() {
  const { id } = useParams();
  const [f, setF] = useState(null);
  const [products, setProducts] = useState([]); // [{id,name,price,image_url}] in this outfit
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, notify] = useToast();

  useEffect(() => {
    adminApi(`/outfits/${id}`).then(async ({ item }) => {
      setF({ name: item.name, description: item.description, image: item.image_url || "", hidden: !!item.hidden });
      const found = await Promise.all(item.product_ids.map((pid) => adminApi(`/products/${pid}`).then((d) => d.product).catch(() => null)));
      setProducts(found.filter(Boolean));
    }).catch((e) => notify(e.message, true));
  }, [id, notify]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => adminApi(`/products?q=${encodeURIComponent(q.trim())}&limit=8`).then((d) => !cancelled && setResults(d.products)).catch(() => {}), 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  async function save() {
    setBusy(true);
    try {
      await adminJson(`/outfits/${id}`, { name: f.name, description: f.description, image_id: idOf(f.image) || null, hidden: f.hidden }, "PUT");
      await adminJson(`/outfits/${id}/products`, { ids: products.map((p) => p.id) }, "PUT");
      notify("Saved");
    } catch (e) {
      notify(e.message, true);
    }
    setBusy(false);
  }

  if (!f) return <p className="ad-muted">Loading…</p>;
  const set = (p) => setF((c) => ({ ...c, ...p }));
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>{f.name}</h1>
          <p><Link href="/admin/outfits">← All outfits</Link> · <a href={`/outfits/${id}`} target="_blank" rel="noreferrer">View outfit ↗</a></p>
        </div>
      </div>
      <div className="ad-card">
        <h2>Outfit</h2>
        <div className="ad-grid">
          <Text label="Name" value={f.name} onChange={(v) => set({ name: v })} />
          <Toggle label="Hidden" checked={f.hidden} onChange={(v) => set({ hidden: v })} />
          <TextArea label="Description" className="full" rows={2} value={f.description} onChange={(v) => set({ description: v })} />
          <ImageField label="Photo (optional)" value={f.image} onChange={(v) => set({ image: v })} notify={notify} hint="Without a photo, a collage of the products is shown." />
        </div>
      </div>
      <div className="ad-card">
        <h2>Products in this outfit <small>up to 12</small></h2>
        <div className="ad-list">
          {products.map((p, i) => (
            <div className="ad-item" key={p.id}>
              <div className="ad-item-head">
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="ad-thumb" src={p.image_url} alt="" />
                )}
                <div className="grow">{p.name}<small>{moneyFmt(p.price)}</small></div>
                <div className="ad-mini">
                  <Button variant="small" disabled={i === 0} onClick={() => setProducts(move(products, i, -1))}>↑</Button>
                  <Button variant="small" disabled={i === products.length - 1} onClick={() => setProducts(move(products, i, 1))}>↓</Button>
                </div>
                <button type="button" className="ad-x" aria-label="Remove" onClick={() => setProducts(products.filter((x) => x.id !== p.id))}>✕</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <input className="ad-search" placeholder="Search products to add…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q.trim().length >= 2 && (
            <div className="ad-tablewrap" style={{ marginTop: 8 }}>
              <table className="ad-table"><tbody>
                {results.filter((r) => !products.some((p) => p.id === r.id)).map((r) => (
                  <tr key={r.id}>
                    <td>{r.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="ad-thumb" src={r.image_url} alt="" />
                    )}</td>
                    <td>{r.name}<br /><small className="ad-muted">{r.category} · {r.color_name}</small></td>
                    <td className="num">{moneyFmt(r.price)}</td>
                    <td><Button variant="small" disabled={products.length >= 12} onClick={() => { setProducts([...products, r]); setQ(""); }}>Add</Button></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
      </div>
      <div className="ad-savebar"><Button variant="primary" busy={busy} onClick={save}>Save outfit</Button></div>
      {toast}
    </>
  );
}
