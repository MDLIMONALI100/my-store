"use client";
// Reviews come from MongoDB (through the API), so they load in the browser
// after the product is already on screen. Also holds the "Write a review" form.
import { Fragment, useEffect, useState } from "react";
import { api } from "@/lib/api";
import Stars from "./Stars";

function Summary({ summary }) {
  if (!summary.count) return null;
  return (
    <div className="review-summary">
      <div className="review-avg">
        <strong>{summary.average.toFixed(1)}</strong>
        <Stars rating={summary.average} size="lg" />
        <span className="hint">
          {summary.count} review{summary.count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="review-bars">
        {[5, 4, 3, 2, 1].map((n) => (
          <div className="review-bar" key={n}>
            <span>{n}★</span>
            <div>
              <i style={{ width: `${Math.round((summary.stars[n] / summary.count) * 100)}%` }} />
            </div>
            <span>{summary.stars[n]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewForm({ productId }) {
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setError("");
    if (!data.rating) return setError("Please choose a star rating.");
    if ((data.name || "").trim().length < 2) return setError("Please enter your name."), form.elements.name.focus();
    if ((data.body || "").trim().length < 10) return setError("Please write at least a sentence."), form.elements.body.focus();
    setSending(true);
    try {
      await api(`/api/products/${encodeURIComponent(productId)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, rating: Number(data.rating) }),
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  if (done)
    return (
      <form className="review-form">
        <div className="review-thanks">
          <strong>Thanks for your review!</strong>
          <p className="hint">It will appear here once our team has checked it.</p>
        </div>
      </form>
    );

  return (
    <form className="review-form" onSubmit={onSubmit} noValidate>
      <h3>Write a review</h3>
      <fieldset className="star-input">
        <legend>Your rating</legend>
        {[5, 4, 3, 2, 1].map((n) => (
          <Fragment key={n}>
            <input type="radio" name="rating" id={`star-${n}`} value={n} />
            <label htmlFor={`star-${n}`} title={`${n} star${n > 1 ? "s" : ""}`}>
              ★
            </label>
          </Fragment>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor="review-name">Your name</label>
        <input id="review-name" name="name" maxLength={60} required autoComplete="given-name" />
      </div>
      <div className="field">
        <label htmlFor="review-body">Your review</label>
        <textarea
          id="review-body"
          name="body"
          rows={4}
          maxLength={1500}
          required
          placeholder="How's the fit, the leather, the feel?"
        />
      </div>
      {/* Honeypot: hidden from people, bots fill it in and get rejected */}
      <div className="hp" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="form-error" role="alert">
        {error}
      </p>
      <button type="submit" className="btn btn-lg" disabled={sending}>
        {sending ? "Sending…" : "Submit review"}
      </button>
      <p className="hint">Reviews appear after a quick check by our team.</p>
    </form>
  );
}

export default function Reviews({ productId }) {
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    api(`/api/products/${encodeURIComponent(productId)}/reviews`)
      .then((d) => !cancelled && setState({ status: "ok", ...d }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [productId]);

  return (
    <section className="reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="section-head">
        <h2 id="reviews-title">Reviews</h2>
      </div>
      <div className="reviews-layout">
        <div>
          {state.status === "ok" && <Summary summary={state.summary} />}
          <ReviewForm productId={productId} />
        </div>
        <div className="review-list">
          {state.status === "loading" && <p className="hint">Loading reviews…</p>}
          {state.status === "error" && (
            <p className="hint">Reviews couldn&apos;t load right now. Please refresh to try again.</p>
          )}
          {state.status === "ok" &&
            (state.reviews.length ? (
              state.reviews.map((r, i) => (
                <article className="review" key={r.id || i}>
                  <header>
                    <Stars rating={r.rating} />
                    <strong>{r.name}</strong>
                    <time className="hint" dateTime={r.createdAt}>
                      {new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </time>
                  </header>
                  <p>{r.body}</p>
                </article>
              ))
            ) : (
              <div className="review-empty">
                <p>No reviews yet.</p>
                <span className="hint">Own this jacket? Be the first to review it.</span>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
