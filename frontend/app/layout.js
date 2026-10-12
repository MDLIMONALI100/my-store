import { Suspense } from "react";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Streetwear · Leather Jackets",
  description:
    "Leather jackets with attitude. Biker, bomber, café racer and suede styles.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CartProvider>
          {/* Header reads the URL (for the highlighted nav link), so it needs Suspense */}
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          {children}
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
