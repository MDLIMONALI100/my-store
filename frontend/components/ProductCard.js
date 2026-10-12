import Link from "next/link";
import { formatPrice, isOnSale } from "@/lib/helpers";
import WishButton from "./WishButton";

function Badge({ p }) {
  if (p.stock === 0) return <span className="card-badge soldout">Sold out</span>;
  if (isOnSale(p)) return <span className="card-badge sale">−{Math.round((1 - p.price / p.compare_at_price) * 100)}%</span>;
  if (p.stock <= 5) return <span className="card-badge">Only {p.stock} left</span>;
  if (p.badge) return <span className="card-badge">{p.badge}</span>;
  return null;
}

// One product in a grid. The second photo fades in on hover (desktop), and the cards
// slide in one after another as they scroll into view (data-reveal).
export default function ProductCard({ p, index = 0, columns = 4 }) {
  return (
    <div className="card" data-reveal="zoom" style={{ "--i": index % columns }}>
      <Link href={`/product/${p.id}`} className="card-link" aria-label={p.name}>
        <Badge p={p} />
        <div className="thumb has-img">
          {p.image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" />
              {p.hover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="hover-img" src={p.hover_url} alt="" loading="lazy" decoding="async" />
              )}
            </>
          ) : (
            <span aria-hidden="true">{p.emoji}</span>
          )}
        </div>
        <div className="card-body">
          <h3>{p.name}</h3>
          <div className="card-footer">
            <span className="price">
              {formatPrice(p.price)}
              {isOnSale(p) && <s className="was">{formatPrice(p.compare_at_price)}</s>}
            </span>
            {p.color_name && (
              <span className="card-color">
                {p.color_hex && <i style={{ background: p.color_hex }} />}
                {p.color_name}
              </span>
            )}
          </div>
        </div>
      </Link>
      <WishButton id={p.id} name={p.name} />
    </div>
  );
}
