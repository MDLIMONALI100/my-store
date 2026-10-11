// Store design settings: defaults, validation and the CSS they produce.
// Shared by the Worker (to style pages before they're sent) and the admin
// Design page (for live preview), so both always agree.

export const HEADING_FONTS = ["Anton", "Bebas Neue", "Archivo Black", "Oswald", "Space Grotesk", "Playfair Display", "Inter"];
export const BODY_FONTS = ["Inter", "DM Sans", "Work Sans", "Space Grotesk", "Roboto"];
export const CARD_RATIOS = { "4/5": "Portrait (4:5)", "3/4": "Tall (3:4)", "1/1": "Square (1:1)" };

export const DEFAULTS = {
  store_name: "Streetwear",
  show_announcement: true,
  announcement: "Leather season is here | Free shipping over $50 | New drop: 16 jackets",

  color_bg: "#0b0b0b",
  color_text: "#f5f5f0",
  color_accent: "#c6ff00",
  font_heading: "Anton",
  font_body: "Inter",
  heading_uppercase: true,
  radius: 4,

  grid_cols: 4,
  grid_cols_mobile: 2,
  grid_gap: 16,
  card_ratio: "4/5",
  card_show_category: true,
  card_show_sizes: true,
  card_hover_zoom: true,

  hero_eyebrow: "New drop · Leather season",
  hero_line1: "Wear it",
  hero_line2: "loud.",
  hero_text: "Biker, bomber, café racer and suede. Leather jackets cut for the street and built to be worn in.",
  hero_button: "Shop the drop",
  shop_title: "The drop",
  show_categories: true,
  show_editorial: true,
  show_features: true,
};

// Ready-made looks the admin can start from.
export const PRESETS = {
  "Streetwear (default)": {},
  "Clean light": {
    color_bg: "#fafaf7", color_text: "#151515", color_accent: "#151515",
    font_heading: "Space Grotesk", font_body: "DM Sans", heading_uppercase: false, radius: 10,
    grid_cols: 3, grid_gap: 24, card_ratio: "4/5",
  },
  "Luxury": {
    color_bg: "#0f0d0b", color_text: "#efe8dc", color_accent: "#c9a46a",
    font_heading: "Playfair Display", font_body: "Work Sans", heading_uppercase: false, radius: 0,
    grid_cols: 3, grid_gap: 28, card_ratio: "3/4",
  },
  "Blood orange": {
    color_bg: "#111111", color_text: "#ffffff", color_accent: "#ff4d1f",
    font_heading: "Bebas Neue", font_body: "Inter", heading_uppercase: true, radius: 0,
    grid_cols: 4, grid_gap: 12, card_ratio: "3/4",
  },
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const TEXT_LIMITS = {
  store_name: 40, announcement: 300, hero_eyebrow: 60, hero_line1: 30, hero_line2: 30,
  hero_text: 240, hero_button: 30, shop_title: 40,
};
const NUMBER_RANGES = { radius: [0, 24], grid_cols: [2, 5], grid_cols_mobile: [1, 2], grid_gap: [0, 40] };

// Accepts anything and returns a complete, safe settings object.
export function sanitize(input) {
  const s = { ...DEFAULTS };
  if (!input || typeof input !== "object") return s;
  for (const key of Object.keys(DEFAULTS)) {
    const v = input[key];
    if (v === undefined) continue;
    const def = DEFAULTS[key];
    if (typeof def === "boolean") s[key] = Boolean(v);
    else if (key in NUMBER_RANGES) {
      const n = Math.round(Number(v));
      const [min, max] = NUMBER_RANGES[key];
      if (Number.isFinite(n)) s[key] = Math.min(max, Math.max(min, n));
    } else if (key.startsWith("color_")) {
      if (HEX.test(v)) s[key] = v.toLowerCase();
    } else if (key === "font_heading") {
      if (HEADING_FONTS.includes(v)) s[key] = v;
    } else if (key === "font_body") {
      if (BODY_FONTS.includes(v)) s[key] = v;
    } else if (key === "card_ratio") {
      if (v in CARD_RATIOS) s[key] = v;
    } else if (typeof v === "string") {
      s[key] = v.trim().slice(0, TEXT_LIMITS[key] || 100);
    }
  }
  if (!s.store_name) s.store_name = DEFAULTS.store_name;
  return s;
}

export function fontsUrl(s) {
  const fam = (name, weights) => `family=${name.replace(/ /g, "+")}${weights ? `:wght@${weights}` : ""}`;
  const heavy = ["Anton", "Bebas Neue", "Archivo Black"].includes(s.font_heading);
  const families = new Set([fam(s.font_heading, heavy ? "" : "500;700"), fam(s.font_body, "400;500;600;700")]);
  return `https://fonts.googleapis.com/css2?${[...families].join("&")}&display=swap`;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio between two hex colors (1 = none, 21 = black on white).
export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function buildCss(input) {
  const s = sanitize(input);
  const light = luminance(s.color_bg) > 0.5;
  const onAccent = contrast(s.color_accent, "#0b0b0b") >= contrast(s.color_accent, "#ffffff") ? "#0b0b0b" : "#ffffff";
  const tablet = Math.min(s.grid_cols, 3);
  const small = Math.max(s.grid_cols_mobile, Math.min(s.grid_cols, 2));

  let css = `:root{
  --bg:${s.color_bg};
  --text:${s.color_text};
  --accent:${s.color_accent};
  --on-accent:${onAccent};
  --surface:color-mix(in srgb, ${s.color_bg} 93%, ${s.color_text});
  --surface-2:color-mix(in srgb, ${s.color_bg} 87%, ${s.color_text});
  --border:color-mix(in srgb, ${s.color_bg} 83%, ${s.color_text});
  --muted:color-mix(in srgb, ${s.color_text} 58%, ${s.color_bg});
  --accent-hover:color-mix(in srgb, ${s.color_accent} 82%, ${light ? "#000" : "#fff"});
  --success:${light ? "#15803d" : "#4ade80"};
  --danger:${light ? "#c4372f" : "#ff5a4e"};
  --radius:${s.radius}px;
  --display:"${s.font_heading}", "Impact", sans-serif;
  --body:"${s.font_body}", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color-scheme:${light ? "light" : "dark"};
}
.grid{grid-template-columns:repeat(${s.grid_cols},1fr);gap:${Math.round(s.grid_gap * 1.75)}px ${s.grid_gap}px}
.card .thumb{aspect-ratio:${s.card_ratio}}
@media (max-width:1080px){.grid{grid-template-columns:repeat(${tablet},1fr)}}
@media (max-width:860px){.grid{grid-template-columns:repeat(${small},1fr)}}
@media (max-width:560px){.grid{grid-template-columns:repeat(${s.grid_cols_mobile},1fr)}}
`;
  if (!s.heading_uppercase) css += `h1,h2,h3,.display,.logo,.cat-tile span,.feature strong,.empty p,.footer-wordmark{text-transform:none;letter-spacing:-0.01em;line-height:1.02}\n`;
  if (!s.card_show_category) css += `.card .card-body > .category{display:none}\n`;
  if (!s.card_show_sizes) css += `.card .card-footer .category{display:none}\n`;
  if (!s.card_hover_zoom) css += `.card:hover .thumb img,.cat-tile:hover img{transform:none}\n`;
  if (!s.show_announcement) css += `.marquee{display:none}\n`;
  return css;
}

// Safe to put inside a <script> tag.
export function settingsScript(s) {
  return `window.SITE=${JSON.stringify(s).replace(/</g, "\\u003c")};`;
}
