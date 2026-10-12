"use client";
// Small building blocks shared by every admin screen.
import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi, uploadPhoto } from "@/lib/adminApi";

// ---------- messages ----------
// const [toast, notify] = useToast();  notify("Saved") / notify("Oops", true);  render {toast}
export function useToast() {
  const [state, setState] = useState(null);
  const timer = useRef(null);
  const notify = useCallback((text, error = false) => {
    clearTimeout(timer.current);
    setState({ text, error });
    timer.current = setTimeout(() => setState(null), error ? 6000 : 2500);
  }, []);
  const toast = state ? (
    <div className={`ad-toast ${state.error ? "is-error" : ""}`} role="status">
      {state.text}
    </div>
  ) : null;
  return [toast, notify];
}

// ---------- form fields ----------
export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`ad-field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Text({ label, value, onChange, hint, className, type = "text", ...rest }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}

export function TextArea({ label, value, onChange, hint, rows = 4, className, ...rest }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <textarea rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}

export function Select({ label, value, onChange, options, hint, className }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const [v, text] = Array.isArray(o) ? o : [o, o];
          return (
            <option key={v} value={v}>
              {text}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="ad-toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

export function Button({ children, variant = "", busy, ...rest }) {
  return (
    <button type="button" className={`ad-btn ${variant}`} disabled={busy || rest.disabled} {...rest}>
      {busy ? "Working…" : children}
    </button>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="ad-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ad-modal-scrim" onClick={onClose} />
      <div className={`ad-modal-box ${wide ? "wide" : ""}`}>
        <header>
          <h3>{title}</h3>
          <button type="button" className="ad-x" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="ad-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---------- photos ----------
// Picks a photo from the media library (everything ever uploaded).
export function MediaPicker({ onPick, onClose }) {
  const [images, setImages] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminApi("/images?limit=120")
      .then((d) => setImages(d.images))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <Modal title="Choose a photo" onClose={onClose} wide>
      {error && <p className="ad-error">{error}</p>}
      {!images && !error && <p className="ad-muted">Loading…</p>}
      <div className="ad-media-grid">
        {images?.map((img) => (
          <button key={img.id} type="button" className="ad-media-item" onClick={() => onPick(img)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </Modal>
  );
}

// One photo: shows it, and lets you upload a new one or pick from the library.
// value = photo URL ("/images/abc..."), onChange(url|"")
export function ImageField({ label, value, onChange, hint, notify }) {
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const input = useRef(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await uploadPhoto(file);
      onChange(url);
    } catch (err) {
      notify?.(err.message, true);
    }
    setBusy(false);
  }

  return (
    <div className="ad-field">
      <span>{label}</span>
      <div className="ad-image-field">
        <div className="ad-image-preview">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" />
          ) : (
            <em>No photo</em>
          )}
        </div>
        <div className="ad-image-actions">
          <Button onClick={() => input.current?.click()} busy={busy}>
            Upload new
          </Button>
          <Button onClick={() => setPicking(true)}>From library</Button>
          {value && (
            <Button variant="ghost" onClick={() => onChange("")}>
              Remove
            </Button>
          )}
          <input ref={input} type="file" accept="image/*" hidden onChange={onFile} />
        </div>
      </div>
      {hint && <small>{hint}</small>}
      {picking && (
        <MediaPicker
          onClose={() => setPicking(false)}
          onPick={(img) => {
            onChange(img.url);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

// ---------- data loading ----------
// const { data, error, reload } = useLoad("/orders");
export function useLoad(path) {
  const [state, setState] = useState({ data: null, error: "" });
  const reload = useCallback(() => {
    adminApi(path)
      .then((data) => setState({ data, error: "" }))
      .catch((e) => setState({ data: null, error: e.message }));
  }, [path]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { ...state, reload };
}

export const moneyFmt = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
export const dateFmt = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");

// Moves item i of a list up (-1) or down (+1).
export function move(list, i, by) {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
