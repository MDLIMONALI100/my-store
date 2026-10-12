import Link from "next/link";
import { formatPrice, sizeRange } from "@/lib/helpers";
import Stars from "./Stars";
import Thumb from "./Thumb";

function Badge({ stock }) {
  if (stock === 0) return <span className="card-badge soldout">Sold out</span>;
  if (stock <= 5) return <span className="card-badge">Only {stock} left</span>;
  return null;
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
