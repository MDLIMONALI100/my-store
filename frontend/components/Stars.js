// Star rating display. Partial stars are filled by CSS width (see .stars in styles).
export default function Stars({ rating, size = "" }) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <span
      className={`stars ${size}`}
      style={{ "--r": r }}
      role="img"
      aria-label={`${r.toFixed(1)} out of 5 stars`}
    />
  );
}
