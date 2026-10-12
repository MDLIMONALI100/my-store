import { Suspense } from "react";
import { CartProvider } from "@/components/CartProvider";
import { WishlistProvider } from "@/components/WishlistProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SmoothScroll from "@/components/SmoothScroll";
import RevealObserver from "@/components/RevealObserver";
import { getSite } from "@/lib/site";

// Everything customers see: header, footer, cart drawer, smooth scrolling and animations.
export default async function ShopLayout({ children }) {
  const { storefront, menus } = await getSite();
  return (
    <>
      <CartProvider>
        <WishlistProvider>
          {/* Header reads the URL (for the highlighted menu link), so it needs Suspense */}
          <Suspense fallback={null}>
            <Header
              storeName={storefront.store_name}
              announcement={storefront.announcement}
              showAnnouncement={storefront.show_announcement}
              items={menus.header}
            />
          </Suspense>
          {children}
          <Footer storefront={storefront} shopLinks={menus.footer_shop} infoLinks={menus.footer_info} />
          <CartDrawer freeShippingOver={storefront.free_shipping_over} shippingFlat={storefront.shipping_flat} />
        </WishlistProvider>
      </CartProvider>
      <SmoothScroll />
      <RevealObserver />
    </>
  );
}
