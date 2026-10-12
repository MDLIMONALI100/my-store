"use client";
// Email sign-up box (used in the footer and the home page newsletter section).
import { useState } from "react";
import { postJson } from "@/lib/api";
import { ArrowIcon } from "./Icons";

export default function NewsletterForm({ button = "Subscribe", placeholder = "Your email" }) {
  const [state, setState] = useState({ status: "idle", error: "" });

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setState({ status: "sending", error: "" });
    try {
      await postJson("/api/newsletter", Object.fromEntries(new FormData(form)));
      setState({ status: "done", error: "" });
    } catch (err) {
      setState({ status: "idle", error: err.message });
    }
  }

  if (state.status === "done") return <p className="newsletter-thanks">Thanks! You are on the list.</p>;
  return (
    <form className="newsletter-form" onSubmit={onSubmit} noValidate>
      <label className="visually-hidden" htmlFor="nl-email">
        Email address
      </label>
      <input id="nl-email" name="email" type="email" placeholder={placeholder} autoComplete="email" required />
      {/* Honeypot: hidden from people, bots fill it in and get ignored */}
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button type="submit" disabled={state.status === "sending"} aria-label={button}>
        <ArrowIcon />
      </button>
      {state.error && <p className="form-error">{state.error}</p>}
    </form>
  );
}
