import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="container">
      <div className="empty-shop" style={{ padding: "120px 0" }}>
        <p className="display" style={{ fontSize: "clamp(3rem, 10vw, 7rem)" }}>
          404
        </p>
        <p className="hint">That page doesn&apos;t exist, or the product is no longer available.</p>
        <Link href="/shop" className="btn btn-lg">
          Back to the shop
        </Link>
      </div>
    </main>
  );
}
