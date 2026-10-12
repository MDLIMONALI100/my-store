import Link from "next/link";
import { formatPrice, sizeRange } from "@/lib/helpers";
import Stars from "./Stars";

function Badge({ stock }) {
  if (stock === 0) return <span className="card-badge soldout">Sold out</span>;
  if (stock <= 5) return <span className="card-badge">Only {stock} left</span>;
  return null;
}

// Product photo if there is one, otherwise the emoji on a colored tile.
function Thumb({ p }) {
  const bg = /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : "#eef0f4";
  return p.image_url ? (
    <div className="thumb has-img" style={{ background: bg }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" />
    </div>
  ) : (
    <div className="thumb" style={{ background: bg }} aria-hidden="true">
      {p.emoji}
    </div>
  );
}

export default function ProductCard({ p }) {
  return (
    <Link className="card" href={`/product?id=${encodeURIComponent(p.id)}`}>
      <Badge stock={p.stock} />
      <Thumb p={p} />
      <div className="card-body">
        <span className="category">{p.category}</span>
        <h3>{p.name}</h3>
        {p.rating_count > 0 && (
          <span className="card-rating">
            <Stars rating={p.rating_avg} />
            <small>
              {p.rating_avg.toFixed(1)} ({p.rating_count})
            </small>
          </span>
        )}
        <div className="card-footer">
          <span className="price">{formatPrice(p.price)}</span>
          <span className="category">{sizeRange(p)}</span>
        </div>
      </div>
    </Link>
  );
}
