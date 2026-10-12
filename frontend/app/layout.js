import Script from "next/script";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import "./shop.css";
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

// The shared page shell: fonts, theme colours. The shop's header/footer live in (shop)/layout.js
// and the admin panel has its own layout in (admin)/admin/layout.js.
export default async function RootLayout({ children }) {
  const { theme } = await getSite();
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
        {children}
      </body>
    </html>
  );
}
