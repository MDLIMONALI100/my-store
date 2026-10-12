// Draws the home page from the list of sections stored in the database (see /api/home).
// Each section has a "type"; the admin can reorder, hide and edit them.
import Link from "next/link";
import ProductCard from "./ProductCard";
import OutfitCard from "./OutfitCard";
import SplitText from "./SplitText";
import NewsletterForm from "./NewsletterForm";
import Viewer360 from "./Viewer360";
import { ArrowIcon, BadgeIcon, BoxIcon, LockIcon, TruckIcon } from "./Icons";

const ICONS = { truck: TruckIcon, box: BoxIcon, badge: BadgeIcon, lock: LockIcon };

function Button({ link, className = "btn btn-lg", children }) {
  if (!link?.href) return null;
  return (
    <Link href={link.href} className={className}>
      {children || link.label}
    </Link>
  );
}

function Hero({ data }) {
  const lines = [data.line1, data.line2].filter(Boolean).join("\n");
  return (
    <section className="hero">
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="hero-kicker" data-reveal="fade" style={{ whiteSpace: "pre-line" }}>
            {data.kicker}
          </p>
          <div>
            <SplitText as="h1" text={lines} outlineLast />
            {data.text && (
              <p className="hero-lead" data-reveal style={{ "--i": 4 }}>
                {data.text}
              </p>
            )}
          </div>
          <div className="hero-actions" data-reveal style={{ "--i": 5 }}>
            <Button link={data.button} />
            {data.link?.href && (
              <Link href={data.link.href} className="link-under">
                {data.link.label}
              </Link>
            )}
          </div>
        </div>
        <div className="hero-media" data-reveal="fade">
          {data.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.image} alt="" fetchPriority="high" />
          )}
          {data.tag && (
            <span className="hero-tag" style={{ whiteSpace: "pre-line" }}>
              {data.tag}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function CategoryBand({ data }) {
  const items = data.items || [];
  if (!items.length) return null;
  return (
    <section className="category-band theme-dark">
      <div className="container categories" style={{ "--cols": Math.min(items.length, 4) }}>
        {items.map((c, i) => (
          <Link key={c.id} className="cat-tile" href={`/shop/${c.id}`} data-reveal style={{ "--i": i }}>
            <div className="cat-img">
              {c.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image_url} alt="" loading="lazy" />
              )}
            </div>
            <div>
              <h3>{c.name}</h3>
              <small>{c.tagline}</small>
              <span className="link-under">
                Shop {c.name} <ArrowIcon className="arrow" width="14" height="14" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductRail({ data }) {
  const products = (data.products || []).slice(0, 8);
  if (!products.length) return null;
  return (
    <section className="container rail-section">
      <div className="rail-head">
        <div>
          <SplitText as="h2" className="display" text={data.title || "Shop"} />
          {data.subtitle && <p data-reveal style={{ "--i": 3 }}>{data.subtitle}</p>}
        </div>
        {data.href && (
          <Link href={data.href} className="link-arrow">
            {data.linkLabel || "View all"}
          </Link>
        )}
      </div>
      <div className="rail">
        {products.map((p, i) => (
          <ProductCard key={p.id} p={p} index={i} />
        ))}
      </div>
    </section>
  );
}

function Banner({ data }) {
  return (
    <section className="split-section">
      <div
        className="split-img"
        style={data.image ? { backgroundImage: `url('${data.image}')` } : undefined}
        role="img"
        aria-label={data.title?.replace(/\n/g, " ") || "Featured collection"}
        data-reveal="fade"
      />
      <div className="split-text">
        {data.eyebrow && (
          <span className="eyebrow" data-reveal>
            {data.eyebrow}
          </span>
        )}
        <SplitText text={data.title || ""} />
        {data.text && (
          <p data-reveal style={{ "--i": 3 }}>
            {data.text}
          </p>
        )}
        <div data-reveal style={{ "--i": 4 }}>
          <Button link={data.button} />
        </div>
      </div>
    </section>
  );
}

function Outfits({ data }) {
  const items = data.items || [];
  if (!items.length) return null;
  return (
    <section className="container rail-section">
      <div className="rail-head">
        <div>
          <SplitText as="h2" className="display" text={data.title || "Outfits"} />
          {data.subtitle && <p data-reveal style={{ "--i": 3 }}>{data.subtitle}</p>}
        </div>
        {data.href && (
          <Link href={data.href} className="link-arrow">
            {data.linkLabel || "All outfits"}
          </Link>
        )}
      </div>
      <div className="outfit-rail">
        {items.map((o, i) => (
          <OutfitCard key={o.id} outfit={o} index={i} />
        ))}
      </div>
    </section>
  );
}

function Perks({ data }) {
  const items = data.items || [];
  if (!items.length) return null;
  return (
    <section className="features">
      {items.map((p, i) => {
        const Icon = ICONS[p.icon] || BadgeIcon;
        return (
          <div className="feature container" key={i} data-reveal style={{ "--i": i }}>
            <Icon />
            <div>
              <strong>{p.title}</strong>
              <span>{p.text}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Newsletter({ data }) {
  return (
    <section className="newsletter-section">
      <div className="container inner">
        <div>
          <SplitText as="h2" className="display" text={data.title || "Join the list"} />
          {data.text && <p data-reveal style={{ "--i": 3 }}>{data.text}</p>}
        </div>
        <div data-reveal style={{ "--i": 2 }}>
          <NewsletterForm button={data.button || "Subscribe"} />
        </div>
      </div>
    </section>
  );
}

function TextBlock({ data }) {
  return (
    <section className="container rail-section" style={{ maxWidth: 820, textAlign: "center" }}>
      {data.title && <SplitText as="h2" className="display" text={data.title} />}
      {data.text && <p className="hero-lead" style={{ margin: "18px auto 0" }}>{data.text}</p>}
    </section>
  );
}

const SECTIONS = {
  hero: Hero,
  categories: CategoryBand,
  product_rail: ProductRail,
  banner: Banner,
  outfits: Outfits,
  viewer360: Viewer360,
  perks: Perks,
  newsletter: Newsletter,
  text: TextBlock,
};

export default function HomeSections({ sections }) {
  return sections.map((s) => {
    const Component = SECTIONS[s.type];
    return Component ? <Component key={s.id} data={s.data} /> : null;
  });
}
