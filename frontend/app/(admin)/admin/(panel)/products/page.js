"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminApi, adminJson } from "@/lib/adminApi";
import { Button, moneyFmt, useToast } from "@/components/admin/kit";

const PER = 50;

export default function Products() {
  const [filters, setFilters] = useState({ q: "", category: "", hidden: "", sort: "" });
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [bulkCat, setBulkCat] = useState("");
  const [toast, notify] = useToast();

  const load = useCallback(() => {
    const q = new URLSearchParams({ limit: PER, offset: page * PER });
    for (const [k, v] of Object.entries(filters)) if (v) q.set(k, v);
    adminApi(`/products?${q}`).then(setData).catch((e) => notify(e.message, true));
  }, [filters, page, notify]);
  useEffect(() => {
    const t = setTimeout(load, filters.q ? 250 : 0); // wait a moment while typing in the search box
    return () => clearTimeout(t);
  }, [load, filters.q]);
  useEffect(() => {
    adminApi("/categories").then((d) => setCategories(d.items)).catch(() => {});
  }, []);

  const set = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
    setPicked(new Set());
  };
  const toggle = (id) =>
    setPicked((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allOnPage = data?.products.every((p) => picked.has(p.id));

  async function bulk(action, value) {
    if (action === "delete" && !confirm(`Delete ${picked.size} products for good? Past orders keep their own copy of the name and price.`)) return;
    try {
      await adminJson("/products/bulk", { ids: [...picked], action, value });
      notify("Done");
      setPicked(new Set());
      load();
    } catch (e) {
      notify(e.message, true);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PER)) : 1;
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Products</h1>
          <p>{data ? `${data.total} products` : "Loading…"}</p>
        </div>
        <div className="ad-actions">
          <Link href="/admin/products/new" className="ad-btn primary">
            Add product
          </Link>
        </div>
      </div>

      <div className="ad-toolbar">
        <input className="ad-search" placeholder="Search name, color…" value={filters.q} onChange={(e) => set({ q: e.target.value })} aria-label="Search products" />
        <select className="ad-search" style={{ maxWidth: 190 }} value={filters.category} onChange={(e) => set({ category: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="ad-search" style={{ maxWidth: 150 }} value={filters.hidden} onChange={(e) => set({ hidden: e.target.value })} aria-label="Visibility">
          <option value="">Shown + hidden</option>
          <option value="0">Shown in shop</option>
          <option value="1">Hidden</option>
        </select>
        <select className="ad-search" style={{ maxWidth: 170 }} value={filters.sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort">
          <option value="">Default order</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="name_asc">Name A–Z</option>
        </select>
      </div>

      {picked.size > 0 && (
        <div className="ad-bulk">
          <b>{picked.size} selected</b>
          <Button onClick={() => bulk("show")}>Show</Button>
          <Button onClick={() => bulk("hide")}>Hide</Button>
          <Button onClick={() => bulk("feature")}>Feature</Button>
          <Button onClick={() => bulk("unfeature")}>Unfeature</Button>
          <Button onClick={() => bulk("new")}>Mark new</Button>
          <Button onClick={() => bulk("unnew")}>Unmark new</Button>
          <select value={bulkCat} onChange={(e) => setBulkCat(e.target.value)} aria-label="Move to category">
            <option value="">Move to…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <Button disabled={!bulkCat} onClick={() => bulk("set_category", bulkCat)}>
            Move
          </Button>
          <Button variant="danger" onClick={() => bulk("delete")}>
            Delete
          </Button>
        </div>
      )}

      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>
                <input type="checkbox" checked={!!allOnPage && data?.products.length > 0} onChange={(e) => setPicked(e.target.checked ? new Set(data.products.map((p) => p.id)) : new Set())} aria-label="Select all" />
              </th>
              <th></th>
              <th>Name</th>
              <th>Category</th>
              <th>Color</th>
              <th className="num">Price</th>
              <th className="num">Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.products.map((p) => (
              <tr key={p.id}>
                <td>
                  <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} />
                </td>
                <td>
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="ad-thumb" src={p.image_url} alt="" loading="lazy" />
                  ) : (
                    <span className="ad-thumb" />
                  )}
                </td>
                <td>
                  <Link href={`/admin/products/${p.id}`}>
                    <b>{p.name}</b>
                  </Link>
                </td>
                <td>{p.category}</td>
                <td>{p.color_name}</td>
                <td className="num">
                  {moneyFmt(p.price)}
                  {p.compare_at_price > p.price && <small className="ad-muted"> (was {moneyFmt(p.compare_at_price)})</small>}
                </td>
                <td className="num">{p.stock === 0 ? <span className="ad-badge bad">0</span> : p.stock <= 5 ? <span className="ad-badge warn">{p.stock}</span> : p.stock}</td>
                <td>
                  {p.hidden ? <span className="ad-badge">Hidden</span> : <span className="ad-badge ok">Shown</span>} {p.featured ? <span className="ad-badge dark">Featured</span> : null} {p.is_new ? <span className="ad-badge warn">New</span> : null}
                </td>
              </tr>
            ))}
            {data && !data.products.length && (
              <tr>
                <td colSpan={8} className="ad-muted">
                  No products match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="ad-pager">
        <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          ← Previous
        </Button>
        <span>
          Page {page + 1} of {pages}
        </span>
        <Button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
          Next →
        </Button>
      </div>
      {toast}
    </>
  );
}
