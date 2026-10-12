import ShopListing, { shopTitle } from "@/components/ShopListing";

export async function generateMetadata({ searchParams }) {
  return { title: await shopTitle("", await searchParams) };
}

export default async function ShopPage({ searchParams }) {
  return <ShopListing searchParams={await searchParams} />;
}
