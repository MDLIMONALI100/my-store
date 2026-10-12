import Script from "next/script";
import { Suspense } from "react";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import "./shop.css";
import { CartProvider } from "@/components/CartProvider";
import { WishlistProvider } from "@/components/WishlistProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SmoothScroll from "@/components/SmoothScroll";
import RevealObserver from "@/components/RevealObserver";
import { getSite, themeCss } from "@/lib/site";

// Fonts are downloaded at build time and served from our own site (no Google request per visitor).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export async function generateMetadata() {
  const { storefront } = await getSite();
  return {
    title: { default: `${storefront.store_name} · Leather Jackets, Denim & Boots`, template: `%s · ${storefront.store_name}` },
    description: "Premium leather jackets, denim jeans and boots. Outfits built to be worn in.",
  };
}

// Runs before the page paints: tells the CSS that JavaScript is available (so scroll
// animations can start hidden), and switches animations off again if they never start.
const jsFlag = `document.documentElement.classList.add('js');setTimeout(function(){var c=document.documentElement.classList;if(!c.contains('reveal-ready'))c.add('reveal-fallback')},3000)`;

export default async function RootLayout({ children }) {
  const { storefront, theme, menus } = await getSite();
  return (
    <html lang="en" className={`${inter.variable} ${archivo.variable}`} suppressHydrationWarning>
      <head>
        {/* Colours chosen in the admin (Settings > Theme) */}
        <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
      </head>
      <body>
        <Script id="js-flag" strategy="beforeInteractive">
          {jsFlag}
        </Script>
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
      </body>
    </html>
  );
}
