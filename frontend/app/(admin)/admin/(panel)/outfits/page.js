"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminApi, adminJson } from "@/lib/adminApi";
import { Button, useLoad, useToast } from "@/components/admin/kit";

export default function Outfits() {
  const router = useRouter();
  const { data, reload } = useLoad("/outfits");
  const [name, setName] = useState("");
  const [toast, notify] = useToast();

  async function create() {
    if (!name.trim()) return;
    try {
      const { item } = await adminJson("/outfits", { name });
      router.push(`/admin/outfits/${item.id}`);
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function remove(o) {
    if (!confirm(`Delete the outfit "${o.name}"?`)) return;
    await adminApi(`/outfits/${o.id}`, { method: "DELETE" }).catch((e) => notify(e.message, true));
    reload();
  }
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Outfits</h1>
          <p>Looks made of several products. Shoppers can add the whole look to their cart.</p>
        </div>
      </div>
      <div className="ad-card">
        <div className="ad-toolbar" style={{ margin: 0 }}>
          <input className="ad-search" placeholder="New outfit name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
          <Button variant="primary" onClick={create}>Create outfit</Button>
        </div>
      </div>
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead><tr><th>Name</th><th>Pieces</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {data?.items.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/outfits/${o.id}`}><b>{o.name}</b></Link></td>
                <td>{o.piece_count}</td>
                <td>{o.hidden ? <span className="ad-badge">Hidden</span> : <span className="ad-badge ok">Live</span>}</td>
                <td><Button variant="small danger" onClick={() => remove(o)}>Delete</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast}
    </>
  );
}
