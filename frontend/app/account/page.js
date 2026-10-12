import AccountClient from "@/components/AccountClient";

export const metadata = { title: "My account" };

export default function AccountPage() {
  return (
    <main className="container account">
      <h1 className="display">My account</h1>
      <AccountClient />
    </main>
  );
}
