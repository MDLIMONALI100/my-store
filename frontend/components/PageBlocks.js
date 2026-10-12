// Draws a content page (About, FAQ, ...) from its list of blocks. Text is always rendered
// as plain text, never HTML, so nothing typed in the admin can run code on the page.
import Link from "next/link";
import ContactForm from "./ContactForm";

export default function PageBlocks({ blocks, storefront }) {
  return blocks.map((b, i) => {
    const key = `${b.type}-${i}`;
    switch (b.type) {
      case "heading":
        return <h2 key={key}>{b.text}</h2>;
      case "text":
        return <p key={key} style={{ whiteSpace: "pre-line" }}>{b.text}</p>;
      case "list":
        return (
          <ul key={key}>
            {(b.items || []).map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        );
      case "faq":
        return (
          <div className="faq" key={key}>
            {(b.items || []).map((item, j) => (
              <details key={j}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        );
      case "image":
        // eslint-disable-next-line @next/next/no-img-element
        return b.url ? <img key={key} src={b.url} alt={b.alt || ""} loading="lazy" /> : null;
      case "button":
        return b.href ? (
          <Link key={key} href={b.href} className="btn btn-lg">
            {b.label || "Learn more"}
          </Link>
        ) : null;
      case "contact_form":
        return (
          <div key={key}>
            <ContactForm />
            {(storefront.contact_email || storefront.contact_phone) && (
              <p className="contact-info">
                {storefront.contact_email && <span>Email: {storefront.contact_email}</span>}
                {storefront.contact_phone && <span>Phone: {storefront.contact_phone}</span>}
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  });
}
