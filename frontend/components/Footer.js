import Link from "next/link";
import CartLink from "./CartLink";
import SplitText from "./SplitText";
import NewsletterForm from "./NewsletterForm";

export default function Footer({ storefront, shopLinks, infoLinks }) {
  const name = storefront.store_name;
  const socials = [
    ["Instagram", storefront.instagram_url],
    ["Facebook", storefront.facebook_url],
    ["TikTok", storefront.tiktok_url],
  ].filter(([, url]) => url);

  return (
    <footer className="site-footer theme-dark">
      <div className="container">
        <div className="footer-top">
          <div className="small" data-reveal="fade">
            Get in touch
            <br />
            with us
            <p>Questions about an order, a fit or a product? Our team is happy to help.</p>
            <Link href="/contact" className="link-under">
              Contact us
            </Link>
          </div>
          <SplitText as="p" className="big display" text={storefront.footer_statement || "Built to be\nworn in."} />
        </div>

        <div className="footer-grid">
          <div>
            <span className="footer-brand">{name}</span>
            <span>{storefront.footer_tagline}</span>
            {socials.length > 0 && (
              <span className="footer-socials">
                {socials.map(([label, url]) => (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer">
                    {label}
                  </a>
                ))}
              </span>
            )}
          </div>
          <div>
            <h4>Shop</h4>
            {shopLinks.map((l) => (
              <Link key={l.id} href={l.href}>
                {l.label}
              </Link>
            ))}
          </div>
          <div>
            <h4>Info</h4>
            {infoLinks.map((l) => (
              <Link key={l.id} href={l.href}>
                {l.label}
              </Link>
            ))}
            <CartLink>Your cart</CartLink>
            <Link href="/account">My account</Link>
          </div>
          <div>
            <h4>Newsletter</h4>
            <NewsletterForm />
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {name}. All rights reserved.
          </span>
          <span>Demo store · photos from Unsplash</span>
        </div>
      </div>
    </footer>
  );
}
