import OrderSuccess from "@/components/OrderSuccess";

export const metadata = { title: "Order placed" };

export default function SuccessPage() {
  return (
    <main className="container">
      <OrderSuccess />
    </main>
  );
}
