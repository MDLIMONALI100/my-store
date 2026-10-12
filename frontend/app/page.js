import Link from "next/link";
import ShopGrid from "@/components/ShopGrid";
import SplitText from "@/components/SplitText";
import { ArrowIcon, BadgeIcon, BoxIcon, LockIcon, TruckIcon } from "@/components/Icons";
import { SITE } from "@/lib/helpers";

// Temporary: these photos come from the old site. The photo and category phases replace them.
const CATEGORY_TILES = [
  ["Biker", "Asymmetric zips", "/img/cat-biker.webp"],
  ["Bomber", "Shearling & aviator", "/img/cat-bomber.webp"],
  ["Café Racer", "Clean & minimal", "/img/cat-cafe-racer.webp"],
  ["Suede", "Soft-touch classics", "/img/cat-suede.webp"],
];

const PERKS = [
  [TruckIcon, "Fast delivery", "Quick & safe delivery"],
  [BoxIcon, "Easy returns", "Within 15 days"],
  [BadgeIcon, "Quality assured", "Best leather, best denim"],
  [LockIcon, "Secure checkout", "Your details stay private"],
];

export default async function Home({ searchParams }) {
  const { category = "All" } = await searchParams;
  // A category page skips the home-page banners and goes straight to the grid.
  const isHome = category === "All";

  return (
    <main>
      {isHome && (
        <>
          <section className="hero">
            <div className="hero-grid">
              <div className="hero-copy">
                <p className="hero-kicker" data-reveal="fade">
                  Built for
                  <br />
                  the street.
                </p>
                <div>
                  <SplitText as="h1" text={`${SITE.hero_line1}\n${SITE.hero_line2}`} outlineLast />
                  <p className="hero-lead" data-reveal style={{ "--i": 4 }}>
                    {SITE.hero_text}
                  </p>
                </div>
                <div className="hero-actions" data-reveal style={{ "--i": 5 }}>
                  <a href="#shop" className="btn btn-lg">
                    {SITE.hero_button}
                  </a>
                  <Link href="/?category=Biker" className="link-under">
                    Explore new in
                  </Link>
                </div>
              </div>
              <div className="hero-media" data-reveal="fade">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/hero.webp" alt="" fetchPriority="high" />
                <span className="hero-tag">
                  New
                  <br />
                  collection
                  <br />
                  {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </section>

          {SITE.show_categories && (
            <section className="category-band theme-dark">
              <div className="container categories">
                {CATEGORY_TILES.map(([name, sub, img], i) => (
                  <Link
                    key={name}
                    className="cat-tile"
                    href={`/?category=${encodeURIComponent(name)}`}
                    data-reveal
                    style={{ "--i": i }}
                  >
                    <div className="cat-img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" loading="lazy" />
                    </div>
                    <div>
                      <h3>{name}</h3>
                      <small>{sub}</small>
                      <span className="link-under">
                        Shop {name} <ArrowIcon className="arrow" width="14" height="14" />
                      </span>
                    </div>
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
            <section className="split-section">
              <div
                className="split-img"
                style={{ backgroundImage: "url('/img/editorial.webp')" }}
                role="img"
                aria-label="Shearling-lined leather jackets on a brick wall"
                data-reveal="fade"
              />
              <div className="split-text">
                <span className="eyebrow" data-reveal>
                  New season
                </span>
                <SplitText text={"New\nvibes"} />
                <p data-reveal style={{ "--i": 3 }}>
                  Heavyweight hides, shearling collars and hardware that gets better with every mile. These are
                  pieces you keep for a decade.
                </p>
                <div data-reveal style={{ "--i": 4 }}>
                  <Link href="/?category=Bomber" className="btn btn-lg">
                    Explore collection
                  </Link>
                </div>
              </div>
            </section>
          )}

          {SITE.show_features && (
            <section className="features">
              {PERKS.map(([Icon, title, sub], i) => (
                <div className="feature container" key={title} data-reveal style={{ "--i": i }}>
                  <Icon />
                  <div>
                    <strong>{title}</strong>
                    <span>{sub}</span>
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
