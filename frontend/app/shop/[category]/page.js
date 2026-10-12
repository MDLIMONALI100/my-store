import ShopListing, { shopTitle } from "@/components/ShopListing";

export async function generateMetadata({ params, searchParams }) {
  const { category } = await params;
  return { title: await shopTitle(category, await searchParams) };
}

export default async function CategoryPage({ params, searchParams }) {
  const { category } = await params;
  return <ShopListing categorySlug={category} searchParams={await searchParams} />;
}
