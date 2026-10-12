# Streetwear: a full-stack leather jackets, denim & boots store

A demo online store with a 200-product catalog, filters and search, a slide-out cart with a separate checkout page, customer accounts, a no-code admin panel, and a 360° 3D outfit viewer. It runs live on Cloudflare.

- **Live store:** https://my-store.mdlimonali.workers.dev
- **Admin panel:** https://my-store.mdlimonali.workers.dev/admin (password: the `ADMIN_PASSWORD=` line in `backend/.dev.vars`; never share or commit it)
- **API:** https://my-store-api.mdlimonali.workers.dev
- **Code:** https://github.com/MDLIMONALI100/my-store (branch `main`)

> It is a demo: products, prices and photos are placeholders (free Unsplash photos, some repeated), and no online payment is taken. Customers place an order and the owner arranges payment and delivery by contact.

## How it works (the short version)

| Part | What it is | Where |
|---|---|---|
| Storefront + admin screens | Next.js (App Router, React) on Cloudflare Workers via vinext | `frontend/` |
| API | Express 5 on Cloudflare Workers | `backend/` |
| Products, orders, accounts, content, settings | Cloudflare D1 (SQL) | `migrations/` |
| Product reviews | MongoDB Atlas (database `streetwear`) | `backend/src/reviews.js` |
| Photos | Stored in D1 (resized to WebP in the browser before upload) | `images` table |
| Catalog seed (200 products) | Node scripts using Unsplash photos | `scripts/catalog/` |
| The old single-Worker site | Kept only for rollback | `src/`, `public/` |

The browser only talks to the storefront address. The storefront Worker forwards `/api/*` and `/images/*` to the API Worker over a direct "service binding" (`frontend/worker/index.js`), so sign-in cookies just work.

## What's in the store

- **Shop:** home page built from editable sections, shop and category pages with size, color, price and sort filters, pagination, live search, wishlist, sale prices, color swatches.
- **Product page:** thumbnails, zoom, size picker, tabs, reviews, related products.
- **Cart and checkout:** slide-out cart, then a separate checkout page. The server recalculates prices and stock, so it cannot oversell.
- **Outfits:** six ready-made looks with "add the whole look to cart".
- **360° viewer:** a Three.js mannequin that turns all the way round and takes the colors of the chosen outfit. A real `.glb` model can replace it (see below).
- **Accounts:** sign up, sign in, order history, saved details. Passwords are stored hashed (PBKDF2) and sessions use secure cookies.
- **Content pages:** About, Contact (working form), FAQ, Size guide, Shipping, Privacy, Terms, newsletter sign-up.
- **Admin panel (`/admin`):** dashboard, orders, products (bulk actions), categories, home page sections, menus, pages, outfits, review moderation, customers, inbox, media library, and settings (store details, shipping, colors, 3D viewer).

## Everyday commands

Run these from `~/my-store`:

```bash
npm run dev:api        # API on http://localhost:8788
npm run dev:web        # website on http://localhost:3000
npm run deploy         # put both live (API, then website)
npm run deploy:api     # API only
npm run deploy:web     # website only
npm --prefix backend run migrate:local    # new database tables, local
npm --prefix backend run migrate:remote   # new database tables, live
```

Secrets are never in git: `backend/.dev.vars` locally and Cloudflare secrets live (`ADMIN_PASSWORD`, `MONGODB_URI`, `MONGODB_DB`). Set one with `cd backend && npx wrangler secret put NAME`.

## Putting yourself (or a real model) in the 360° viewer

1. Make a `.glb` 3D model (a phone scan app like Polycam, Scaniverse or Luma AI; export as .glb, no compression, under about 20 MB).
2. Copy it to `frontend/public/models/me.glb` and run `npm run deploy:web`.
3. In the admin: **Settings → 360° viewer → 3D model address** → `/models/me.glb` → Save.

With your own model the outfit buttons no longer recolor the clothes (they still list the products). Uploading a `.glb` through the admin is not built yet (it would need Cloudflare R2).

## Skills gained in this project

**Front end**
- Building a multi-page React app with the Next.js App Router: server and client components, dynamic routes, route groups, metadata, loading data on the server.
- Turning a design reference into responsive HTML/CSS: design tokens (CSS variables), light/dark sections, mobile, tablet and desktop layouts, fixing layout overflow.
- Animation and polish: scroll-triggered reveals, word-by-word headline animation, smooth scrolling (Lenis), reduced-motion support.
- 3D on the web with Three.js: building a model from shapes, lighting, shadows, drag-to-rotate controls, loading a `.glb` model.
- Accessible UI: keyboard and focus handling, ARIA labels, screen-reader text, focus traps in drawers.
- State without a server: cart and wishlist in localStorage with `useSyncExternalStore`, avoiding hydration mismatches.

**Back end**
- Designing a REST API with Express 5 (routers, middleware, validation, error handling) and running it on Cloudflare Workers.
- SQL with Cloudflare D1: schema design, migrations, batched transactions, indexes, safe parameterized queries, filtering/search/paging queries.
- Using two databases for what each does best (SQL for shop data, MongoDB for reviews).
- Money and stock safety: prices in cents, server-side price checks, atomic transactions so stock can't be oversold.
- Authentication done properly: password hashing (PBKDF2), hashed session tokens, HttpOnly/Secure/SameSite cookies, rate limiting, honeypots for bots, and checking that customers can only see their own orders.
- Defending against bad input: validating and sanitizing everything, safe links, never trusting the browser.

**Product and admin**
- Building a no-code admin panel (CRUD screens, bulk actions, drag-free reordering, image upload with browser-side resizing).
- Making a site "content-driven": home sections, menus and pages stored in the database and edited without code.
- Preparing demo data: finding photos, labeling them accurately, generating 200 consistent products with a repeatable script.

**Deploying and working like a professional**
- Deploying a split frontend/API to Cloudflare Workers, service bindings between Workers, secrets, and D1 migrations on a live database.
- Taking a database backup before a risky change, testing on a temporary address, then switching the real address, with a rollback plan.
- Testing in a real browser at phone, tablet and desktop sizes; cleaning up test data afterwards.
- Git workflow: a feature branch, small commits, merging to `main`, never committing secrets.
- Working in phases and writing handoff notes (`CLAUDE.md`) so work can continue later.

## Starting a new conversation about this project

Tell the assistant: "Read `README.md` and `CLAUDE.md` in `~/my-store` first." `CLAUDE.md` has the technical details (architecture, key files, gotchas, rollback command) so nothing needs to be explained again.

Ideas for next steps: replace the demo products and photos with real ones (Admin → Products and Media), upload a real 3D model, add online payments (for example Stripe), send order and review emails, add "forgot password", and a real hero photo.
