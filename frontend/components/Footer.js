import Link from "next/link";
import { CATEGORIES, SITE } from "@/lib/helpers";

const NAV = [["/", "All jackets"], ...CATEGORIES.map((c) => [`/?category=${encodeURIComponent(c)}`, c])];

export default function Footer() {
  const name = SITE.store_name;
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>Shop</h4>
            {NAV.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
          <div>
            <h4>Help</h4>
            <a href="#cart">Your cart</a>
            <span>Free shipping over $50</span>
            <span>No payment taken online</span>
          </div>
          <div className="footer-note">
            <h4>{name}</h4>
            <p>Leather jackets with attitude. Built to be worn in, not worn out.</p>
          </div>
        </div>
        <div className="footer-wordmark" aria-hidden="true">
          {name}
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {name}
          </span>
          <span>Photos: Unsplash</span>
        </div>
      </div>
    </footer>
  );
}
