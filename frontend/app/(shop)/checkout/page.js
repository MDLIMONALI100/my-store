import Link from "next/link";
import CheckoutClient from "@/components/CheckoutClient";
import { getSite } from "@/lib/site";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const { storefront } = await getSite();
  return (
    <main className="container checkout">
      <nav className="breadcrumbs" aria-label="Breadcrumb" style={{ padding: "0 0 18px" }}>
        <Link href="/shop">Continue shopping</Link>
      </nav>
      <h1 className="display">Checkout</h1>
      <CheckoutClient freeShippingOver={storefront.free_shipping_over} shippingFlat={storefront.shipping_flat} />
    </main>
  );
}
