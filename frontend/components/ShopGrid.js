import Link from "next/link";
import ProductCard from "./ProductCard";
import SplitText from "./SplitText";
import { SITE } from "@/lib/helpers";
import { serverApi } from "@/lib/api";

// Server component: fetches the products, then draws the filter chips and the grid.
// Chips are links (/?category=Biker) so the filter is just a URL, same as before.
async function loadProducts() {
  return (await serverApi("/api/products?limit=200")).products;
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
          <SplitText as="h2" text={active === "All" ? SITE.shop_title : active} />
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
          list.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)
        ) : (
          <p className="message" style={{ gridColumn: "1/-1" }}>
            Nothing here yet.
          </p>
        )}
      </div>
    </section>
  );
}
