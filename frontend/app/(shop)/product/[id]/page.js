import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { serverApi } from "@/lib/api";
import { getSite } from "@/lib/site";
import ProductView from "@/components/ProductView";
import ProductCard from "@/components/ProductCard";
import Reviews from "@/components/Reviews";

// cache() lets the page title and the page share one fetch.
const getProduct = cache(async (id) => {
  try {
    return (await serverApi(`/api/products/${encodeURIComponent(id)}`)).product;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
});

export async function generateMetadata({ params }) {
  const p = await getProduct((await params).id);
  return p ? { title: p.name, description: p.description } : { title: "Product not found" };
}

export default async function ProductPage({ params }) {
  const p = await getProduct((await params).id);
  if (!p) notFound();
  const { storefront } = await getSite();

  return (
    <main className="container">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/shop">Shop</Link> /{" "}
        <Link href={`/shop/${p.category_slug || ""}`}>{p.category}</Link> / {p.name}
      </nav>
      <ProductView key={p.id} p={p} freeOver={storefront.free_shipping_over} />
      <Reviews productId={p.id} />
      {p.related.length > 0 && (
        <section className="rail-section" style={{ paddingBottom: 96 }}>
          <div className="rail-head">
            <h2 className="display">You may also like</h2>
            <Link href={`/shop/${p.category_slug || ""}`} className="link-arrow">
              View all
            </Link>
          </div>
          <div className="rail">
            {p.related.slice(0, 4).map((r, i) => (
              <ProductCard key={r.id} p={r} index={i} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
