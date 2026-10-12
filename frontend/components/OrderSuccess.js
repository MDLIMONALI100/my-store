"use client";
// Thank-you page after checkout. The order summary was saved in this browser tab
// (sessionStorage) when the order was placed, so nothing private is in the URL.
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { formatPrice } from "@/lib/helpers";
import { CheckIcon } from "./Icons";

const subscribe = () => () => {};
const read = () => {
  try {
    return sessionStorage.getItem("last-order");
  } catch {
    return null;
  }
};

export default function OrderSuccess() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  let order = null;
  try {
    order = raw ? JSON.parse(raw) : null;
  } catch {}

  return (
    <div className="order-done">
      <div className="drawer-check" aria-hidden="true">
        <CheckIcon width="34" height="34" />
      </div>
      <h1 className="display">Thank you!</h1>
      {order ? (
        <>
          <p className="strong">
            Order {order.orderId} · {formatPrice(order.total)}
          </p>
          <p>We&apos;ll contact you at {order.email} to arrange payment and delivery.</p>
        </>
      ) : (
        <p>Your order has been placed. We&apos;ll contact you to arrange payment and delivery.</p>
      )}
      <Link href="/shop" className="btn btn-lg">
        Keep shopping
      </Link>
    </div>
  );
}
