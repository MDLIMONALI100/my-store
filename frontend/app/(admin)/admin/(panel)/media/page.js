"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi, uploadPhoto } from "@/lib/adminApi";
import { Button, useToast } from "@/components/admin/kit";

const PER = 60;

export default function Media() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const [toast, notify] = useToast();
  const load = useCallback(() => adminApi(`/images?limit=${PER}&offset=${page * PER}`).then(setData).catch((e) => notify(e.message, true)), [page, notify]);
  useEffect(() => { load(); }, [load]);

  async function onFiles(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    setBusy(true);
    for (const file of files) {
      try {
        await uploadPhoto(file);
      } catch (err) {
        notify(`${file.name}: ${err.message}`, true);
      }
    }
    setBusy(false);
    notify(`Uploaded ${files.length} photo${files.length === 1 ? "" : "s"}`);
    setPage(0);
    load();
  }
  async function remove(img) {
    if (!confirm("Delete this photo?")) return;
    try {
      await adminApi(`/images/${img.id}`, { method: "DELETE" });
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
          <h1>Media</h1>
          <p>{data ? `${data.total} photos` : "Loading…"}. Photos are shrunk to web size automatically. A photo that is still used somewhere cannot be deleted.</p>
        </div>
        <div className="ad-actions">
          <Button variant="primary" busy={busy} onClick={() => input.current?.click()}>Upload photos</Button>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={onFiles} />
        </div>
      </div>
      <div className="ad-media-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {data?.images.map((img) => (
          <div className="ad-media-card" key={img.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" loading="lazy" />
            <footer>
              <span>{Math.round(img.size / 1024)} KB</span>
              <span>
                <button type="button" className="ad-x" title="Copy address" onClick={() => navigator.clipboard?.writeText(img.url).then(() => notify("Address copied"))}>⧉</button>
                <button type="button" className="ad-x" title="Delete" onClick={() => remove(img)}>✕</button>
              </span>
            </footer>
          </div>
        ))}
      </div>
      <div className="ad-pager">
        <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Previous</Button>
        <span>Page {page + 1} of {pages}</span>
        <Button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
      </div>
      {toast}
    </>
  );
}
