"use client";
import { useEffect, useState } from "react";
import { adminApi, adminJson, dollars, toCents } from "@/lib/adminApi";
import { Button, Select, Text, TextArea, Toggle, useToast } from "@/components/admin/kit";

const COLORS = [
  ["color_bg", "Page background"], ["color_bg_alt", "Alternate background (hero, banners)"], ["color_surface", "Cards and forms"],
  ["color_text", "Text"], ["color_muted", "Soft text"], ["color_border", "Lines and borders"],
  ["color_accent", "Buttons"], ["color_on_accent", "Text on buttons"], ["color_ink", "Dark sections and footer"],
];

export default function Settings() {
  const [tab, setTab] = useState("store");
  const [all, setAll] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [store, setStore] = useState(null);
  const [theme, setTheme] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, notify] = useToast();

  useEffect(() => {
    adminApi("/settings").then((d) => {
      setAll(d.settings);
      setDefaults(d.defaults);
      setStore({ ...d.settings.storefront, shipping_flat: dollars(d.settings.storefront.shipping_flat), free_shipping_over: dollars(d.settings.storefront.free_shipping_over) });
      setTheme(d.settings.theme);
      setViewer(d.settings.viewer);
    }).catch((e) => notify(e.message, true));
  }, [notify]);

  async function save(group, body) {
    setBusy(true);
    try {
      await adminJson(`/settings/${group}`, body, "PUT");
      notify("Saved. The shop updates within a few seconds.");
    } catch (e) {
      notify(e.message, true);
    }
    setBusy(false);
  }

  if (!all) return <p className="ad-muted">Loading…</p>;
  const s = (p) => setStore((c) => ({ ...c, ...p }));
  const t = (p) => setTheme((c) => ({ ...c, ...p }));

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Settings</h1>
          <p>Store details, colors and the 360° viewer.</p>
        </div>
      </div>
      <div className="ad-tabs" role="tablist">
        {[["store", "Store"], ["theme", "Colors"], ["viewer", "360° viewer"]].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "store" && (
        <>
          <div className="ad-card">
            <h2>Store</h2>
            <div className="ad-grid">
              <Text label="Store name" value={store.store_name} onChange={(v) => s({ store_name: v })} maxLength={40} />
              <Text label="Footer tagline" value={store.footer_tagline} onChange={(v) => s({ footer_tagline: v })} />
              <TextArea label="Big footer statement" rows={2} value={store.footer_statement} onChange={(v) => s({ footer_statement: v })} hint="Press Enter for a new line" />
              <div />
              <Toggle label="Show the announcement bar" checked={store.show_announcement} onChange={(v) => s({ show_announcement: v })} />
              <TextArea label="Announcement messages" className="full" rows={2} value={store.announcement} onChange={(v) => s({ announcement: v })} hint="Separate messages with  |  (a vertical bar)" />
            </div>
          </div>
          <div className="ad-card">
            <h2>Shipping</h2>
            <div className="ad-grid">
              <Text label="Flat shipping ($)" value={store.shipping_flat} onChange={(v) => s({ shipping_flat: v })} inputMode="decimal" />
              <Text label="Free shipping over ($)" value={store.free_shipping_over} onChange={(v) => s({ free_shipping_over: v })} inputMode="decimal" hint="Used at checkout and in the cart" />
            </div>
          </div>
          <div className="ad-card">
            <h2>Contact and social</h2>
            <div className="ad-grid">
              <Text label="Contact email" value={store.contact_email} onChange={(v) => s({ contact_email: v })} />
              <Text label="Contact phone" value={store.contact_phone} onChange={(v) => s({ contact_phone: v })} />
              <Text label="Instagram link" value={store.instagram_url} onChange={(v) => s({ instagram_url: v })} placeholder="https://instagram.com/…" />
              <Text label="Facebook link" value={store.facebook_url} onChange={(v) => s({ facebook_url: v })} />
              <Text label="TikTok link" value={store.tiktok_url} onChange={(v) => s({ tiktok_url: v })} />
            </div>
          </div>
          <div className="ad-savebar">
            <Button variant="primary" busy={busy} onClick={() => save("storefront", { ...store, shipping_flat: toCents(store.shipping_flat), free_shipping_over: toCents(store.free_shipping_over) })}>Save store settings</Button>
          </div>
        </>
      )}

      {tab === "theme" && (
        <div className="ad-split">
          <div className="ad-card">
            <h2>Colors</h2>
            <div className="ad-list">
              {COLORS.map(([key, label]) => (
                <div className="ad-color-row" key={key}>
                  <span>{label}</span>
                  <input type="color" value={theme[key]} onChange={(e) => t({ [key]: e.target.value })} aria-label={label} />
                  <input className="ad-search" value={theme[key]} onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && t({ [key]: e.target.value })} aria-label={`${label} hex`} />
                </div>
              ))}
              <div className="ad-color-row">
                <span>Corner roundness ({theme.radius}px)</span>
                <input type="range" min="0" max="24" value={theme.radius} onChange={(e) => t({ radius: Number(e.target.value) })} style={{ gridColumn: "2 / 4" }} aria-label="Corner roundness" />
              </div>
            </div>
            <div className="ad-actions" style={{ marginTop: 16 }}>
              <Button variant="primary" busy={busy} onClick={() => save("theme", theme)}>Save colors</Button>
              <Button onClick={() => setTheme(defaults.theme)}>Reset to defaults</Button>
            </div>
          </div>
          <div className="ad-preview" style={{ background: theme.color_bg, color: theme.color_text, borderColor: theme.color_border }}>
            <small style={{ color: theme.color_muted }}>Live preview</small>
            <h3 style={{ margin: "8px 0 14px" }}>Built to be worn in</h3>
            <div style={{ background: theme.color_bg_alt, padding: 14, borderRadius: theme.radius, marginBottom: 12 }}>
              <b>Alternate band</b>
              <p style={{ color: theme.color_muted, margin: "4px 0 0" }}>Soft text looks like this.</p>
            </div>
            <div style={{ background: theme.color_surface, border: `1px solid ${theme.color_border}`, padding: 14, borderRadius: theme.radius, marginBottom: 12 }}>Card · $189.00</div>
            <button type="button" style={{ background: theme.color_accent, color: theme.color_on_accent, border: 0, padding: "10px 18px", borderRadius: theme.radius, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", fontSize: ".72rem" }}>Add to cart</button>
            <div style={{ background: theme.color_ink, color: "#f3f2ee", padding: 14, borderRadius: theme.radius, marginTop: 14 }}>Dark section / footer</div>
          </div>
        </div>
      )}

      {tab === "viewer" && (
        <div className="ad-card">
          <h2>360° outfit viewer</h2>
          <p className="ad-muted">Settings for the rotating 3D outfit on the home page.</p>
          <div className="ad-grid">
            <Toggle label="Rotate slowly by itself" checked={viewer.auto_rotate} onChange={(v) => setViewer((c) => ({ ...c, auto_rotate: v }))} />
            <Text label="3D model address (.glb)" value={viewer.model_url} onChange={(v) => setViewer((c) => ({ ...c, model_url: v }))} hint="Leave empty to use the built-in model" />
          </div>
          <div className="ad-actions" style={{ marginTop: 16 }}>
            <Button variant="primary" busy={busy} onClick={() => save("viewer", viewer)}>Save viewer settings</Button>
          </div>
        </div>
      )}
      {toast}
    </>
  );
}
