# Project: "Streetwear" leather jacket store

Existing project, already live. The owner is learning, so explain things simply and show where code lives. Never print secret values or ask the owner to paste them in chat.

## Where everything is
- Local folder: ~/my-store
- Live site: https://my-store.mdlimonali.workers.dev
- GitHub: https://github.com/MDLIMONALI100/my-store (branch main)
- Cloudflare account: limon.dev.contact@gmail.com. Worker "my-store", workers.dev subdomain "mdlimonali". Wrangler is logged in.
- Git identity: MD LIMON ALI <limon.dev.contact@gmail.com>. The git credential is saved in macOS Keychain.

## What it is
A demo online store (no online payment) on Cloudflare Workers with static assets. Plain HTML/CSS/JS, no framework. Dark bold streetwear design with a lime accent.
- Customers: category pages (Biker, Bomber, Café Racer, Suede), 16 jackets with Unsplash photos, size picker, slide-out cart drawer with checkout inside it, star ratings and reviews.
- Admin at /admin (HTTP Basic Auth, username "admin", password in the ADMIN_PASSWORD secret): Orders, Products (add/edit, photo upload, sizes, hide), Reviews (approve/hide/delete), Design (colors, fonts, product grid, home text, live preview).

## Architecture
- Hosting and server code: Cloudflare Workers, entry `src/index.js`.
- Cloudflare D1 "my-store-db" (id be77e626-01be-413f-ad46-b763929d3520), binding `DB`. Tables: products (sizes, hidden, image_id, rating_avg, rating_count), images (photos as blobs, resized to WebP in the browser), orders, order_items (key: order_id+product_id+size), settings. Migrations 0001 to 0005 are in `migrations/`, applied locally and remotely.
- MongoDB Atlas (cluster iwfa16w.mongodb.net, user LIMON, free M0): reviews only. Live database "streetwear", collection "reviews". Local testing uses "streetwear_dev" via `MONGODB_DB` in `.dev.vars`. Reviews start "pending" and need admin approval. Approving recalculates the average in MongoDB and copies it to D1 (`products.rating_avg` / `rating_count`) so product cards load fast.
- Secrets: `ADMIN_PASSWORD` and `MONGODB_URI` are Cloudflare secrets (`wrangler secret put`). Locally they are in `.dev.vars` (git-ignored, three lines: ADMIN_PASSWORD, MONGODB_URI, MONGODB_DB).

## Key files
- `src/index.js`: all routes. Products API, checkout (server recalculates prices, stock shared across sizes, atomic D1 batch so it can't oversell), orders admin, products admin, images (`/images/:id`, cached), settings API, reviews routes, `/api/admin/mongo-health`. Also applies design settings to storefront pages with HTMLRewriter.
- `src/mongo.js`: `withMongo(env, fn)` opens one connection per request (needs `nodejs_compat` in wrangler.jsonc). About 0.6s locally, about 2s live.
- `src/reviews.js`: MongoDB insert/find/aggregate/update/delete and indexes.
- `public/theme.js`: design defaults, presets, `sanitize()`, `buildCss()`. Shared by the Worker and the admin Design page.
- `public/app.js`: shared helpers, cart in localStorage (`{id,size,qty}`), header/footer, star helper, live-preview listener.
- `public/cart-drawer.js`: slide-out cart and checkout. `public/cart.html` only redirects to `/#cart`.
- `public/index.html`, `product.html`, `admin/{index,products,reviews,settings}.html`, `styles.css`.
- `scripts/seed-jackets.mjs` + `seed/jackets/*.webp`: seeds the 16 jackets through the admin API. `seed/PHOTO_CREDITS.md` lists the Unsplash sources.
- `wrangler.jsonc`: assets, `run_worker_first` for `/api/*`, `/admin*`, `/` and the storefront pages, D1 binding, observability.

## Migration to Next.js + Express (branch `nextjs-migration`, NOT live yet)
The live site is still the old Worker (`src/` + `public/`). A rebuild is in progress on the branch `nextjs-migration`; nothing from it is deployed until the owner approves a phase.
- `frontend/`: Next.js (App Router, plain JS). Light editorial design (tokens at top of `frontend/app/globals.css`), Lenis smooth scroll, scroll/text reveal animations (`data-reveal`, `SplitText`). Components in `frontend/components/`. Browser calls to `/api/*` and `/images/*` are proxied to the API (`frontend/next.config.mjs`, env `API_URL`, default http://localhost:8788).
- `backend/`: Express 5 running on a Cloudflare Worker (`my-store-api`, `httpServerHandler` from `cloudflare:node`, `nodejs_compat`). Same D1 database (`DB`) and MongoDB (reviews). Env/secrets via `import { env } from "cloudflare:workers"`. Public routes `backend/src/routes/`, admin routes (Basic Auth) `backend/src/admin/`. `.dev.vars` is a copy of the root one (git-ignored).
- Migration `migrations/0006_storefront_v2.sql` adds categories, product extras (sale price, colour, tabs, badge, featured/new), product_images, menus, pages, home_sections, outfits, subscribers, contact_messages and starter content. Applied LOCALLY only; apply `--remote` before deploying.
- Settings groups (`storefront`, `theme`, `viewer`) live in the `settings` table, defaults in `backend/src/lib/settings.js`.
- Photos are never auto-deleted by the new admin (they can be shared by many products); `DELETE /api/admin/images/:id` refuses while a photo is in use.
- Dev: `npm --prefix backend run dev` (API, :8788, shares local D1 state via `--persist-to ../.wrangler/state`) and `npm --prefix frontend run dev` (:3000). Local migrations: `npm --prefix backend run migrate:local`. Preview configs `api` and `frontend` are in `.claude/launch.json`.
- Plan: Phase 3 catalog (200 products: leather jackets, denim jeans, boots), Phase 4 pages (home sections, shop, product, checkout page, menu pages, outfits), Phase 5 new admin in Next, Phase 6 outfit ideas + 3D 360 viewer, then deploy (OpenNext/vinext for Next on Workers; `wrangler deploy` for the API).

## Workflow
- Preview locally: `npm run dev` (http://localhost:8787). It uses a local D1 and the dev Mongo database, both holding test data.
- Schema change: add `migrations/000N_*.sql`, run `npx wrangler d1 migrations apply my-store-db --local`, then `--remote` before deploying.
- Go live: `npm run deploy`, then `git add -A && git commit && git push`.

## Gotchas
- Use bash, not zsh, for shell scripts that rely on word-splitting variables.
- `~/.npm` has root-owned files, so npm installs need `--cache <temp dir>` (permanent fix: `sudo chown -R $(whoami):staff ~/.npm`).
- The `claude` CLI is not on the owner's PATH. The Cloudflare plugin (cloudflare@cloudflare) is installed for the user, but its MCP server needs OAuth sign-in on first use.
- New workers.dev versions can take about 10s to appear everywhere.
- Keep each `.dev.vars` setting on its own line (a past edit glued two together).

## Known limits
- Demo store: no payment, no customer emails, jacket names/prices/stock are placeholders, photos are free Unsplash stock.
- The shop page loads all products at once (fine up to about 200-300).
- Free-plan capacity is roughly 5-7k visitors/day, because the Worker runs on every page view to apply design settings.
- Old products (tee, hoodie, mug, etc.) are hidden, not deleted. The local D1 and dev Mongo database contain test data.

## Open to-dos / ideas
- Confirm the owner deleted the GitHub personal access token pasted in an earlier chat. The MongoDB password was already rotated.
- Optional: connect GitHub auto-deploy (Cloudflare dashboard > my-store > Settings > Builds).
- Replace placeholder jackets and photos with real ones; Stripe payments; order/review emails; "verified buyer" badge; pagination/search; a Durable Object to keep the Mongo connection warm; possibly move products/orders to MongoDB for practice.
