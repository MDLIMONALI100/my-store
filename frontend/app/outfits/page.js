import Link from "next/link";
import OutfitCard from "@/components/OutfitCard";
import SplitText from "@/components/SplitText";
import { serverApi } from "@/lib/api";

export const metadata = { title: "Outfit ideas" };

export default async function OutfitsPage() {
  const { outfits } = await serverApi("/api/outfits");
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb" style={{ padding: "0 0 22px" }}>
            <Link href="/">Home</Link> / Outfits
          </nav>
          <SplitText as="h1" text={"Outfit\nideas"} />
          <p data-reveal style={{ "--i": 3 }}>
            Jacket, jeans and boots that work together. Add the whole look in one tap.
          </p>
        </div>
      </section>
      <section className="container shop-section" style={{ paddingTop: 56 }}>
        {outfits.length ? (
          <div className="outfit-grid">
            {outfits.map((o, i) => (
              <OutfitCard key={o.id} outfit={o} index={i} />
            ))}
          </div>
        ) : (
          <p className="message">New outfit ideas are coming soon.</p>
        )}
      </section>
    </main>
  );
}
