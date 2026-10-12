import Script from "next/script";
import { Suspense } from "react";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SmoothScroll from "@/components/SmoothScroll";
import RevealObserver from "@/components/RevealObserver";

// Fonts are downloaded at build time and served from our own site (no Google request per visitor).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export const metadata = {
  title: "Streetwear · Leather Jackets, Denim & Boots",
  description: "Premium leather jackets, denim jeans and boots. Outfits built to be worn in.",
};

// Runs before the page paints: tells the CSS that JavaScript is available (so scroll
// animations can start hidden), and switches animations off again if they never start.
const jsFlag = `document.documentElement.classList.add('js');setTimeout(function(){var c=document.documentElement.classList;if(!c.contains('reveal-ready'))c.add('reveal-fallback')},3000)`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${archivo.variable}`} suppressHydrationWarning>
      <body>
        <Script id="js-flag" strategy="beforeInteractive">
          {jsFlag}
        </Script>
        <CartProvider>
          {/* Header reads the URL (for the highlighted nav link), so it needs Suspense */}
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          {children}
          <Footer />
          <CartDrawer />
        </CartProvider>
        <SmoothScroll />
        <RevealObserver />
      </body>
    </html>
  );
}
