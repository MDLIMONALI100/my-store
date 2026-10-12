import { redirect } from "next/navigation";

// The cart is a slide-out drawer. Old /cart links open it on the home page.
export default function CartPage() {
  redirect("/#cart");
}
