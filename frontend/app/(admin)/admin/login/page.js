"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin-auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => d.admin && router.replace("/admin"))
      .catch(() => {});
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const password = new FormData(e.currentTarget).get("password");
    try {
      const res = await fetch("/api/admin-auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not sign in");
      router.replace("/admin");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="ad-login">
      <form onSubmit={submit}>
        <h1>Store admin</h1>
        <p>Sign in to manage your shop.</p>
        <label className="ad-field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" autoFocus required />
        </label>
        {error && <p className="ad-error">{error}</p>}
        <button className="ad-btn primary" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
