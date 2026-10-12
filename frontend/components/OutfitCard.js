import Link from "next/link";
import { formatPrice } from "@/lib/helpers";

// Card for one outfit. Uses the outfit's own photo, or a collage of its products' photos.
export default function OutfitCard({ outfit, index = 0 }) {
  const photos = outfit.items.map((i) => i.image_url).filter(Boolean).slice(0, 3);
  const total = outfit.items.reduce((s, i) => s + i.price, 0);
  return (
    <Link href={`/outfits/${outfit.id}`} className="outfit-card" data-reveal="zoom" style={{ "--i": index % 4 }}>
      <div className="outfit-img">
        {outfit.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={outfit.image_url} alt={outfit.name} loading="lazy" />
        ) : (
          <div className="collage">
            {photos.map((src, i) => (
              <div key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </div>
      <h3>{outfit.name}</h3>
      <p>
        {outfit.items.length} pieces{total ? ` · ${formatPrice(total)}` : ""}
      </p>
    </Link>
  );
}
