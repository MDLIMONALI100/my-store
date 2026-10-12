// A page of products with filters, used by /shop and /shop/[category].
// Server component: reads the filters from the URL, asks the API, draws the grid.
import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/api";
import { shopUrl } from "@/lib/helpers";
import ProductCard from "./ProductCard";
import ShopLayout from "./ShopLayout";
import SplitText from "./SplitText";
import { ArrowIcon } from "./Icons";

const PER_PAGE = 24;

// Filters we accept from the address bar, with a safe default for each.
function readParams(sp) {
  const one = (v) => (Array.isArray(v) ? v[0] : v) || "";
  const num = (v) => (/^\d{1,6}$/.test(one(v)) ? one(v) : "");
  return {
    q: one(sp.q).slice(0, 80),
    size: one(sp.size).slice(0, 12),
    color: one(sp.color).slice(0, 40),
    min: num(sp.min),
    max: num(sp.max),
    sort: ["newest", "price_asc", "price_desc", "popular", "name_asc"].includes(one(sp.sort)) ? one(sp.sort) : "",
    sale: one(sp.sale) === "1" ? "1" : "",
    new: one(sp.new) === "1" ? "1" : "",
    inStock: one(sp.inStock) === "1" ? "1" : "",
    page: Math.max(parseInt(one(sp.page), 10) || 1, 1),
  };
}

export async function shopTitle(categorySlug, searchParams) {
  const params = readParams(searchParams || {});
  if (categorySlug) {
    const { categories } = await serverApi("/api/categories", { revalidate: 10 });
    return categories.find((c) => c.id === categorySlug)?.name || "Shop";
  }
  if (params.q) return `Search: ${params.q}`;
  if (params.sale) return "Sale";
  if (params.new) return "New arrivals";
  return "Shop all";
}

export default async function ShopListing({ categorySlug = "", searchParams }) {
  const params = readParams(searchParams);
  const { categories } = await serverApi("/api/categories", { revalidate: 10 });
  const current = categorySlug ? categories.find((c) => c.id === categorySlug) : null;
  if (categorySlug && !current) notFound();

  // Same filters for the products and for the filter options (without the options themselves).
  const base = new URLSearchParams();
  if (categorySlug) base.set("category", categorySlug);
  if (params.q) base.set("q", params.q);
  if (params.sale) base.set("sale", "1");
  if (params.new) base.set("new", "1");
  if (params.inStock) base.set("inStock", "1");
  const query = new URLSearchParams(base);
  if (params.size) query.set("size", params.size);
  if (params.color) query.set("color", params.color);
  if (params.min) query.set("minPrice", String(Number(params.min) * 100));
  if (params.max) query.set("maxPrice", String(Number(params.max) * 100));
  if (params.sort) query.set("sort", params.sort);
  query.set("limit", String(PER_PAGE));
  query.set("offset", String((params.page - 1) * PER_PAGE));

  const [list, facets] = await Promise.all([serverApi(`/api/products?${query}`), serverApi(`/api/products/facets?${base}`)]);
  const pages = Math.max(Math.ceil(list.total / PER_PAGE), 1);

  const title = current?.name || (params.q ? `Results for “${params.q}”` : params.sale ? "Sale" : params.new ? "New arrivals" : "Shop all");
  const intro = current?.description || (!params.q && !params.sale && !params.new ? "Leather jackets, denim jeans and boots, built to be worn in." : "");
  const pageUrl = (n) => shopUrl(categorySlug, { ...params, page: n > 1 ? n : undefined });

  return (
    <main>
      <section className="shop-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / {current ? <><Link href="/shop">Shop</Link> / {current.name}</> : "Shop"}
          </nav>
          <SplitText as="h1" text={title} />
          {intro && (
            <p className="shop-intro" data-reveal style={{ "--i": 3 }}>
              {intro}
            </p>
          )}
          <div className="category-pills" data-reveal style={{ "--i": 4 }}>
            <Link href="/shop" className="chip" aria-pressed={!categorySlug}>
              All
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={`/shop/${c.id}`} className="chip" aria-pressed={categorySlug === c.id}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container shop-section">
        <ShopLayout category={categorySlug} params={Object.fromEntries(Object.entries(params).filter(([k]) => k !== "page"))} facets={facets} categories={facets.categories} total={list.total}>
          {list.products.length ? (
            <div className="grid">
              {/* key makes the cards animate in again whenever the filters change */}
              {list.products.map((p, i) => (
                <ProductCard key={`${p.id}-${query}`} p={p} index={i} />
              ))}
            </div>
          ) : (
            <div className="empty-shop">
              <p className="display">Nothing found</p>
              <p className="hint">Try removing a filter, or browse everything.</p>
              <Link href="/shop" className="btn btn-lg">
                Shop all
              </Link>
            </div>
          )}

          {pages > 1 && (
            <nav className="pagination" aria-label="Pages">
              {params.page > 1 && (
                <Link href={pageUrl(params.page - 1)} className="page-link" rel="prev">
                  <ArrowIcon width="16" height="16" style={{ transform: "rotate(180deg)" }} /> Previous
                </Link>
              )}
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={pageUrl(n)} className="page-num" aria-current={n === params.page ? "page" : undefined}>
                  {n}
                </Link>
              ))}
              {params.page < pages && (
                <Link href={pageUrl(params.page + 1)} className="page-link" rel="next">
                  Next <ArrowIcon width="16" height="16" />
                </Link>
              )}
            </nav>
          )}
        </ShopLayout>
      </section>
    </main>
  );
}
