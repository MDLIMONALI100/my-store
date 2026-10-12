"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminApi, adminJson } from "@/lib/adminApi";
import { Button, dateFmt, useLoad, useToast } from "@/components/admin/kit";

export default function Pages() {
  const router = useRouter();
  const { data, reload } = useLoad("/pages");
  const [title, setTitle] = useState("");
  const [toast, notify] = useToast();

  async function create() {
    if (!title.trim()) return;
    try {
      const { item } = await adminJson("/pages", { title, content: [] });
      router.push(`/admin/pages/${item.id}`);
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function remove(p) {
    if (!confirm(`Delete the page "${p.title}"?`)) return;
    await adminApi(`/pages/${p.id}`, { method: "DELETE" }).catch((e) => notify(e.message, true));
    reload();
  }

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Pages</h1>
          <p>About, FAQ, Contact and any other page. Link to them from Menus.</p>
        </div>
      </div>
      <div className="ad-card">
        <div className="ad-toolbar" style={{ margin: 0 }}>
          <input className="ad-search" placeholder="New page title" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
          <Button variant="primary" onClick={create}>Create page</Button>
        </div>
      </div>
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead><tr><th>Title</th><th>Address</th><th>Updated</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/admin/pages/${p.id}`}><b>{p.title}</b></Link></td>
                <td><a href={`/${p.id}`} target="_blank" rel="noreferrer" className="ad-code">/{p.id}</a></td>
                <td>{dateFmt(p.updated_at)}</td>
                <td>{p.hidden ? <span className="ad-badge">Hidden</span> : <span className="ad-badge ok">Live</span>}</td>
                <td><Button variant="small danger" onClick={() => remove(p)}>Delete</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast}
    </>
  );
}
