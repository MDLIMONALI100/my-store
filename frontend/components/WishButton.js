"use client";
// Heart button that adds or removes a product from the wishlist.
import { useSyncExternalStore } from "react";
import { HeartIcon } from "./Icons";
import { useWishlist } from "./WishlistProvider";

const noop = () => () => {};
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

// variant "card": small round button over a product photo. "square": big button next to Add to cart.
export default function WishButton({ id, variant = "card", name = "" }) {
  const { ids, toggle } = useWishlist();
  const hydrated = useHydrated(); // the saved list only exists in the browser
  const on = hydrated && ids.includes(id);
  return (
    <button
      type="button"
      className={`wish wish-${variant} ${on ? "is-on" : ""}`}
      aria-pressed={on}
      aria-label={on ? `Remove ${name || "item"} from wishlist` : `Add ${name || "item"} to wishlist`}
      onClick={(e) => {
        e.preventDefault(); // the card around it is a link
        e.stopPropagation();
        toggle(id);
      }}
    >
      <HeartIcon filled={on} />
    </button>
  );
}
