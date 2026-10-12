import Link from "next/link";
import ShopGrid from "@/components/ShopGrid";
import { SITE } from "@/lib/helpers";

const CATEGORY_TILES = [
  ["Biker", "Asymmetric zips", "/img/cat-biker.webp"],
  ["Bomber", "Shearling & aviator", "/img/cat-bomber.webp"],
  ["Café Racer", "Clean & minimal", "/img/cat-cafe-racer.webp"],
  ["Suede", "Soft-touch classics", "/img/cat-suede.webp"],
];

export default async function Home({ searchParams }) {
  const { category = "All" } = await searchParams;
  // A category page skips the home-page banners and goes straight to the grid.
  const isHome = category === "All";

  return (
    <main>
      {isHome && (
        <>
          <section className="hero" style={{ backgroundImage: "url('/img/hero.webp')" }}>
            <div className="container hero-content">
              <span className="eyebrow">{SITE.hero_eyebrow}</span>
              <h1>
                <span>{SITE.hero_line1}</span>
                <br />
                <span className="outline">{SITE.hero_line2}</span>
              </h1>
              <p>{SITE.hero_text}</p>
              <div className="hero-actions">
                <a href="#shop" className="btn btn-lg">
                  {SITE.hero_button}
                </a>
                <Link href="/?category=Biker" className="btn btn-lg btn-outline">
                  Biker jackets
                </Link>
              </div>
            </div>
          </section>

          {SITE.show_categories && (
            <section className="section container">
              <div className="section-head">
                <div>
                  <h2>Shop by style</h2>
                  <p>Four silhouettes. Zero compromises.</p>
                </div>
              </div>
              <div className="categories">
                {CATEGORY_TILES.map(([name, sub, img]) => (
                  <Link key={name} className="cat-tile" href={`/?category=${encodeURIComponent(name)}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" loading="lazy" />
                    <span>
                      {name}
                      <small>{sub}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ShopGrid active={category} />

      {isHome && (
        <>
          {SITE.show_editorial && (
            <section className="split">
              <div
                className="split-img"
                style={{ backgroundImage: "url('/img/editorial.webp')" }}
                role="img"
                aria-label="Shearling-lined leather jackets on a brick wall"
              />
              <div className="split-text">
                <span className="eyebrow">The aviator edit</span>
                <h2>
                  Built to be
                  <br />
                  <em>worn in.</em>
                </h2>
                <p>
                  Heavyweight hides, shearling collars and hardware that gets better with every mile.
                  These are jackets you keep for a decade.
                </p>
                <Link href="/?category=Bomber" className="btn btn-lg">
                  Shop bombers
                </Link>
              </div>
            </section>
          )}

          {SITE.show_features && (
            <section className="container">
              <div className="features">
                <div className="feature">
                  <strong>Free shipping</strong>
                  <span>On every order over $50.</span>
                </div>
                <div className="feature">
                  <strong>Pick your size</strong>
                  <span>XS to XXL across most styles.</span>
                </div>
                <div className="feature">
                  <strong>No payment online</strong>
                  <span>Order now, we&apos;ll contact you to arrange payment.</span>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
