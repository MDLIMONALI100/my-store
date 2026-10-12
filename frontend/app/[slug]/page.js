import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import PageBlocks from "@/components/PageBlocks";
import SplitText from "@/components/SplitText";
import { serverApi } from "@/lib/api";
import { getSite } from "@/lib/site";

// Any other address (/about, /faq, /contact, ...) shows the content page with that name
// from the admin. Pages that don't exist or are hidden give a normal 404.
const getPage = cache(async (slug) => {
  try {
    return (await serverApi(`/api/pages/${encodeURIComponent(slug)}`, { revalidate: 10 })).page;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
});

export async function generateMetadata({ params }) {
  const page = await getPage((await params).slug);
  return page ? { title: page.title, description: page.meta_description || undefined } : { title: "Page not found" };
}

export default async function ContentPage({ params }) {
  const page = await getPage((await params).slug);
  if (!page) notFound();
  const { storefront } = await getSite();
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb" style={{ padding: "0 0 22px" }}>
            <Link href="/">Home</Link> / {page.title}
          </nav>
          <SplitText as="h1" text={page.title} />
          {page.subtitle && (
            <p data-reveal style={{ "--i": 3 }}>
              {page.subtitle}
            </p>
          )}
        </div>
      </section>
      <div className="container prose">
        <PageBlocks blocks={page.content} storefront={storefront} />
      </div>
    </main>
  );
}
