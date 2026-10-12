import "../../admin.css";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }) {
  return <div className="ad-root">{children}</div>;
}
