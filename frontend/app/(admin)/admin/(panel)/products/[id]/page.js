"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminApi, adminJson, dollars, toCents } from "@/lib/adminApi";
import { Button, ImageField, MediaPicker, Select, Text, TextArea, Toggle, move, useToast } from "@/components/admin/kit";
import { uploadPhoto } from "@/lib/adminApi";

const EMPTY = {
  name: "", category: "", description: "", price: "", compare: "", stock: "10", sizes: "", color_name: "", color_hex: "", style_group: "", badge: "",
  featured: false, is_new: false, hidden: false, details: "", materials: "", fit: "", shipping_info: "", features: "", main: "", gallery: [],
};

// Photo ids are the last part of the "/images/<id>" address.
const idOf = (url) => (url || "").split("/").pop();

export default function ProductEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const router = useRouter();
  const [f, setF] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [loaded, setLoaded] = useState(isNew);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [toast, notify] = useToast();
  const set = (patch) => setF((cur) => ({ ...cur, ...patch }));

  useEffect(() => {
    adminApi("/categories").then((d) => {
      setCategories(d.items);
      if (isNew) setF((cur) => ({ ...cur, category: cur.category || d.items[0]?.name || "" }));
    });
    if (isNew) return;
    adminApi(`/products/${id}`)
      .then(({ product: p }) =>
        setF({
          name: p.name, category: p.category, description: p.description, price: dollars(p.price), compare: dollars(p.compare_at_price), stock: String(p.stock),
          sizes: p.sizes, color_name: p.color_name, color_hex: p.color_hex, style_group: p.style_group, badge: p.badge, featured: !!p.featured, is_new: !!p.is_new,
          hidden: !!p.hidden, details: p.details, materials: p.materials, fit: p.fit, shipping_info: p.shipping_info, features: (p.features || []).join("\n"),
          main: p.image_url || "", gallery: p.gallery.map((g) => g.url),
        })
      )
      .then(() => setLoaded(true))
      .catch((e) => notify(e.message, true));
  }, [id, isNew, notify]);

  async function addPhotos(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    for (const file of files) {
      try {
        const { url } = await uploadPhoto(file);
        setF((cur) => ({ ...cur, gallery: [...cur.gallery, url] }));
      } catch (err) {
        notify(err.message, true);
      }
    }
  }

  async function save() {
    const price = toCents(f.price);
    if (Number.isNaN(price)) return notify("Please enter a price", true);
    const body = {
      name: f.name, category: f.category, description: f.description, price, compare_at_price: f.compare ? toCents(f.compare) : null, stock: Number(f.stock),
      sizes: f.sizes, color_name: f.color_name, color_hex: f.color_hex, style_group: f.style_group, badge: f.badge, featured: f.featured, is_new: f.is_new, hidden: f.hidden,
      details: f.details, materials: f.materials, fit: f.fit, shipping_info: f.shipping_info, features: f.features.split("\n"),
      imageId: idOf(f.main) || null, gallery: f.gallery.map(idOf),
    };
    setBusy(true);
    try {
      const res = isNew ? await adminJson("/products", body) : await adminJson(`/products/${id}`, body, "PUT");
      notify("Saved");
      if (isNew) router.replace(`/admin/products/${res.product.id}`);
    } catch (e) {
      notify(e.message, true);
    }
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Delete this product for good? Past orders keep their own copy of the name and price.")) return;
    try {
      await adminApi(`/products/${id}`, { method: "DELETE" });
      router.replace("/admin/products");
    } catch (e) {
      notify(e.message, true);
    }
  }

  if (!loaded) return <p className="ad-muted">Loading…</p>;
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>{isNew ? "Add product" : f.name || "Edit product"}</h1>
          <p>
            <Link href="/admin/products">← All products</Link>
            {!isNew && (
              <>
                {" · "}
                <a href={`/product/${id}`} target="_blank" rel="noreferrer">
                  View in shop ↗
                </a>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="ad-card">
        <h2>Basics</h2>
        <div className="ad-grid">
          <Text label="Name" value={f.name} onChange={(v) => set({ name: v })} className="full" maxLength={100} />
          <Select label="Category" value={f.category} onChange={(v) => set({ category: v })} options={categories.map((c) => c.name)} />
          <Text label="Badge" value={f.badge} onChange={(v) => set({ badge: v })} hint='Small label on the card, e.g. "Best Seller"' maxLength={30} />
          <TextArea label="Short description" value={f.description} onChange={(v) => set({ description: v })} className="full" maxLength={2000} />
        </div>
      </div>

      <div className="ad-card">
        <h2>Price and stock</h2>
        <div className="ad-grid three">
          <Text label="Price ($)" value={f.price} onChange={(v) => set({ price: v })} inputMode="decimal" />
          <Text label="Old price ($)" value={f.compare} onChange={(v) => set({ compare: v })} inputMode="decimal" hint="Shown crossed out when higher than the price (a sale)" />
          <Text label="Stock" value={f.stock} onChange={(v) => set({ stock: v })} inputMode="numeric" hint="Shared across all sizes" />
          <Text label="Sizes" value={f.sizes} onChange={(v) => set({ sizes: v })} className="full" hint="Separated by commas, e.g. S, M, L, XL. Leave empty if there are no sizes." />
        </div>
      </div>

      <div className="ad-card">
        <h2>Color and style</h2>
        <div className="ad-grid three">
          <Text label="Color name" value={f.color_name} onChange={(v) => set({ color_name: v })} maxLength={40} />
          <label className="ad-field">
            <span>Swatch color</span>
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(f.color_hex) ? f.color_hex : "#cccccc"} onChange={(e) => set({ color_hex: e.target.value })} />
          </label>
          <Text label="Style group" value={f.style_group} onChange={(v) => set({ style_group: v })} hint="Products with the same group show as color swatches on each other's page" maxLength={60} />
        </div>
        <div className="ad-grid" style={{ marginTop: 14 }}>
          <Toggle label="Featured" hint="Appears in “Best of” sections" checked={f.featured} onChange={(v) => set({ featured: v })} />
          <Toggle label="New arrival" hint="Appears in “New arrivals”" checked={f.is_new} onChange={(v) => set({ is_new: v })} />
          <Toggle label="Hidden" hint="Not shown in the shop" checked={f.hidden} onChange={(v) => set({ hidden: v })} />
        </div>
      </div>

      <div className="ad-card">
        <h2>Photos</h2>
        <ImageField label="Main photo" value={f.main} onChange={(v) => set({ main: v })} notify={notify} />
        <div className="ad-field" style={{ marginTop: 18 }}>
          <span>More photos (gallery)</span>
          <div className="ad-gallery">
            {f.gallery.map((url, i) => (
              <div className="ad-gallery-item" key={url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" />
                <div className="ad-mini">
                  <button type="button" aria-label="Move left" onClick={() => set({ gallery: move(f.gallery, i, -1) })}>←</button>
                  <button type="button" aria-label="Remove" onClick={() => set({ gallery: f.gallery.filter((_, j) => j !== i) })}>✕</button>
                  <button type="button" aria-label="Move right" onClick={() => set({ gallery: move(f.gallery, i, 1) })}>→</button>
                </div>
              </div>
            ))}
          </div>
          <div className="ad-actions" style={{ marginTop: 8 }}>
            <label className="ad-btn">
              Upload photos
              <input type="file" accept="image/*" multiple hidden onChange={addPhotos} />
            </label>
            <Button onClick={() => setPicking(true)}>From library</Button>
          </div>
          <small>The last gallery photo is also used as the large close-up on the product page.</small>
        </div>
      </div>

      <div className="ad-card">
        <h2>Product page tabs</h2>
        <div className="ad-grid">
          <TextArea label="Details" value={f.details} onChange={(v) => set({ details: v })} />
          <TextArea label="Materials & care" value={f.materials} onChange={(v) => set({ materials: v })} />
          <TextArea label="Size & fit" value={f.fit} onChange={(v) => set({ fit: v })} />
          <TextArea label="Shipping & returns" value={f.shipping_info} onChange={(v) => set({ shipping_info: v })} />
          <TextArea label="Feature bullets" value={f.features} onChange={(v) => set({ features: v })} className="full" rows={5} hint="One per line (up to 12). Shown with check marks under Details." />
        </div>
      </div>

      <div className="ad-savebar">
        <Button variant="primary" busy={busy} onClick={save}>
          {isNew ? "Create product" : "Save changes"}
        </Button>
        {!isNew && (
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
        )}
      </div>
      {picking && (
        <MediaPicker
          onClose={() => setPicking(false)}
          onPick={(img) => {
            set({ gallery: [...f.gallery, img.url] });
            setPicking(false);
          }}
        />
      )}
      {toast}
    </>
  );
}
