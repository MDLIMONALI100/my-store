// Shop-wide content that the admin edits: store name, announcement, menus, colours.
// Loaded once per page. If the API is down we fall back to these defaults so the
// page shell (header, footer) still renders.
import { cache } from "react";
import { serverApi } from "./api";

const FALLBACK = {
  storefront: {
    store_name: "Streetwear", show_announcement: false, announcement: "", shipping_flat: 500, free_shipping_over: 5000,
    contact_email: "", contact_phone: "", instagram_url: "", facebook_url: "", tiktok_url: "",
    footer_tagline: "Leather jackets, denim and boots with attitude.", footer_statement: "Built to be\nworn in.",
  },
  theme: {},
  viewer: {},
  menus: {
    header: [
      { id: 1, label: "Shop All", href: "/shop" },
      { id: 2, label: "Jackets", href: "/shop/leather-jackets" },
      { id: 3, label: "Jeans", href: "/shop/denim-jeans" },
      { id: 4, label: "Boots", href: "/shop/boots" },
    ],
    footer_shop: [],
    footer_info: [],
  },
};

export const getSite = cache(async () => {
  try {
    const [settings, menus] = await Promise.all([
      serverApi("/api/settings", { revalidate: 10 }),
      serverApi("/api/menus", { revalidate: 10 }),
    ]);
    return { ...settings, menus: menus.menus };
  } catch (err) {
    console.error("site data unavailable", err.message);
    return FALLBACK;
  }
});

// The theme colours become CSS variables on :root (see the tokens at the top of globals.css).
const VARS = {
  color_bg: "--bg", color_bg_alt: "--bg-alt", color_surface: "--surface", color_text: "--text", color_muted: "--muted",
  color_border: "--border", color_accent: "--accent", color_on_accent: "--on-accent", color_ink: "--ink",
};
export function themeCss(theme = {}) {
  const decls = [];
  for (const [key, cssVar] of Object.entries(VARS)) if (/^#[0-9a-f]{6}$/i.test(theme[key])) decls.push(`${cssVar}:${theme[key]}`);
  if (Number.isInteger(theme.radius)) decls.push(`--radius:${theme.radius}px`);
  if (/^#[0-9a-f]{6}$/i.test(theme.color_accent)) decls.push(`--accent-hover:color-mix(in srgb, ${theme.color_accent} 82%, white)`);
  return decls.length ? `:root{${decls.join(";")}}` : "";
}
