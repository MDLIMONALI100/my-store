// Store API: Express running on a Cloudflare Worker.
//   Public:  /api/*   and  /images/:id
//   Admin:   /api/admin/*   (HTTP Basic Auth, see lib/auth.js)
import express from "express";
import { httpServerHandler } from "cloudflare:node";
import { adminAuthRoutes, requireAdmin } from "./lib/auth.js";
import publicRoutes, { serveImage } from "./routes/public.js";
import checkoutRoutes from "./routes/checkout.js";
import accountRoutes from "./routes/account.js";
import adminProducts from "./admin/products.js";
import adminOrders from "./admin/orders.js";
import adminContent from "./admin/content.js";
import adminMisc from "./admin/misc.js";

const app = express();
app.disable("x-powered-by");

// JSON bodies only (photo uploads use their own raw parser inside the admin route).
app.use(express.json({ limit: "200kb" }));

// API answers are never cached by the browser; photos (below) are cached for a year.
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/images/:id", serveImage);

app.use("/api/admin-auth", adminAuthRoutes);
app.use("/api/admin", requireAdmin, adminProducts, adminOrders, adminContent, adminMisc);
app.use("/api/account", accountRoutes);
app.use("/api", publicRoutes, checkoutRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Errors thrown with httpError() carry their own status and a customer-safe message.
// Anything unexpected is logged and answered with a generic message.
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status < 500 ? err.message : "Something went wrong. Please try again." });
});

app.listen(3000);
export default httpServerHandler({ port: 3000 });
