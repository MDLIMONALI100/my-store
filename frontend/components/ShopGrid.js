import Link from "next/link";
import ProductCard from "./ProductCard";
import { SITE } from "@/lib/helpers";

// Server component: fetches the products, then draws the filter chips and the grid.
// Chips are links (/?category=Biker) so the filter is just a URL, same as before.
async function loadProducts() {
  // TEMPORARY: reads from the old Worker. Step 5 points this at the Express API.
  const res = await fetch(`${process.env.OLD_WORKER_URL || "http://localhost:8787"}/api/products`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()).products;
}

export default async function ShopGrid({ active }) {
  let all;
  try {
    all = await loadProducts();
  } catch (err) {
    return (
      <section className="section container" id="shop">
        <div className="grid">
          <p className="message error">Couldn&apos;t load products. {err.message}</p>
        </div>
      </section>
    );
  }

  const cats = ["All", ...new Set(all.map((p) => p.category))];
  const list = active === "All" ? all : all.filter((p) => p.category === active);

  return (
    <section className="section container" id="shop">
      <div className="section-head">
        <div>
          <h2 id="shop-title">{active === "All" ? SITE.shop_title : active}</h2>
          <p id="shop-sub">
            {list.length} jacket{list.length === 1 ? "" : "s"}
          </p>
        </div>
        {active !== "All" && (
          <Link href="/" className="link-arrow">
            ← All jackets
          </Link>
        )}
      </div>
      <div className="filters" role="group" aria-label="Filter by style">
        {cats.map((c) => (
          <Link
            key={c}
            href={c === "All" ? "/#shop" : `/?category=${encodeURIComponent(c)}`}
            className="chip"
            aria-pressed={c === active}
          >
            {c}
          </Link>
        ))}
      </div>
      <div className="grid">
        {list.length ? (
          list.map((p) => <ProductCard key={p.id} p={p} />)
        ) : (
          <p className="message" style={{ gridColumn: "1/-1" }}>
            Nothing here yet.
          </p>
        )}
      </div>
    </section>
  );
}
