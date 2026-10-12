import Link from "next/link";
import { CATEGORIES, SITE } from "@/lib/helpers";
import CartLink from "./CartLink";
import SplitText from "./SplitText";

export default function Footer() {
  const name = SITE.store_name;
  return (
    <footer className="site-footer theme-dark">
      <div className="container">
        <div className="footer-top">
          <div className="small" data-reveal="fade">
            Get in touch
            <br />
            with us
            <p>Contact us and our team will be happy to answer all your questions.</p>
          </div>
          <SplitText as="p" className="big display" text={"Built to be\nworn in."} />
        </div>

        <div className="footer-grid">
          <div>
            <span className="footer-brand">{name}</span>
            <span>Leather jackets, denim and boots with attitude.</span>
          </div>
          <div>
            <h4>Shop</h4>
            <Link href="/">All products</Link>
            {CATEGORIES.map((c) => (
              <Link key={c} href={`/?category=${encodeURIComponent(c)}`}>
                {c}
              </Link>
            ))}
          </div>
          <div>
            <h4>Help</h4>
            <CartLink>Your cart</CartLink>
            <span>Free shipping over $50</span>
            <span>No payment taken online</span>
          </div>
          <div>
            <h4>Info</h4>
            <span>Photos: Unsplash</span>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {name}. All rights reserved.
          </span>
          <span>Demo store</span>
        </div>
      </div>
    </footer>
  );
}
