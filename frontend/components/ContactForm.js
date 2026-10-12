"use client";
import { useState } from "react";
import { postJson } from "@/lib/api";

export default function ContactForm() {
  const [state, setState] = useState({ status: "idle", error: "" });

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setState({ status: "sending", error: "" });
    try {
      await postJson("/api/contact", Object.fromEntries(new FormData(form)));
      setState({ status: "done", error: "" });
    } catch (err) {
      setState({ status: "idle", error: err.message });
    }
  }

  if (state.status === "done") return <p className="form-ok">Thanks! We got your message and will reply within one working day.</p>;
  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="cf-name">Your name</label>
        <input id="cf-name" name="name" maxLength={100} required autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="cf-email">Email</label>
        <input id="cf-email" name="email" type="email" maxLength={254} required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="cf-message">Message</label>
        <textarea id="cf-message" name="message" rows={6} maxLength={3000} required />
      </div>
      {/* Honeypot: hidden from people, bots fill it in and get ignored */}
      <div className="hp" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="form-error" role="alert">
        {state.error}
      </p>
      <button type="submit" className="btn btn-lg" disabled={state.status === "sending"} style={{ justifySelf: "start" }}>
        {state.status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
