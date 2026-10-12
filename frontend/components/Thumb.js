// Product photo if there is one, otherwise the emoji on a colored tile.
export default function Thumb({ p }) {
  const bg = /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : "#eef0f4";
  return p.image_url ? (
    <div className="thumb has-img" style={{ background: bg }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" />
    </div>
  ) : (
    <div className="thumb" style={{ background: bg }} aria-hidden="true">
      {p.emoji}
    </div>
  );
}
