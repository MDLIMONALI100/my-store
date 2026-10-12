import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import OutfitBuy from "@/components/OutfitBuy";
import { serverApi } from "@/lib/api";

const getOutfit = cache(async (id) => {
  try {
    return (await serverApi(`/api/outfits/${encodeURIComponent(id)}`)).outfit;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
});

export async function generateMetadata({ params }) {
  const o = await getOutfit((await params).id);
  return o ? { title: o.name, description: o.description } : { title: "Outfit not found" };
}

export default async function OutfitPage({ params }) {
  const o = await getOutfit((await params).id);
  if (!o) notFound();
  const photos = o.items.map((i) => i.image_url).filter(Boolean).slice(0, 3);
  return (
    <main className="container">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/outfits">Outfits</Link> / {o.name}
      </nav>
      <div className="outfit-page">
        <div className="outfit-img" data-reveal="fade" style={{ background: "var(--surface-2)" }}>
          {o.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.image_url} alt={o.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div className="collage">
              {photos.map((src, i) => (
                <div key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h1 className="pdp-title">{o.name}</h1>
          {o.description && <p className="pdp-desc" style={{ borderBottom: 0, paddingBottom: 0 }}>{o.description}</p>}
          <OutfitBuy items={o.items} />
        </div>
      </div>
    </main>
  );
}
