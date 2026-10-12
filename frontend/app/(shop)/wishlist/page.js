import WishlistClient from "@/components/WishlistClient";

export const metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <main className="container account">
      <h1 className="display">Wishlist</h1>
      <WishlistClient />
    </main>
  );
}
