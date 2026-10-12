import Link from "next/link";
import { cache } from "react";
import { serverApi } from "@/lib/api";
import { SITE } from "@/lib/helpers";
import ProductDetail from "@/components/ProductDetail";
import Reviews from "@/components/Reviews";

// Old URLs look like /product?id=midnight-asymmetric-biker, so we keep that shape.
// cache() makes the title and the page share one fetch.
const getProduct = cache(async (id) => (await serverApi(`/api/products/${encodeURIComponent(id)}`)).product);

export async function generateMetadata({ searchParams }) {
  const { id } = await searchParams;
  try {
    const p = await getProduct(id);
    return { title: `${p.name} · ${SITE.store_name}` };
  } catch {
    return { title: `Jacket · ${SITE.store_name}` };
  }
}

export default async function ProductPage({ searchParams }) {
  const { id } = await searchParams;
  let p;
  try {
    if (!id) throw new Error("No product selected.");
    p = await getProduct(id);
  } catch (err) {
    return (
      <main className="container">
        <p className="message error">{err.message}</p>
        <p className="message">
          <Link href="/" className="link-arrow">
            ← Back to shop
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="container">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Shop</Link> / <Link href={`/?category=${encodeURIComponent(p.category)}`}>{p.category}</Link> /{" "}
        {p.name}
      </nav>
      <ProductDetail p={p} />
      <Reviews productId={p.id} />
    </main>
  );
}
