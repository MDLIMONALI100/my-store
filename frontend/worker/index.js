// Entry point of the storefront Worker. It wraps vinext's own handler to talk to the API Worker
// over a direct "service binding" (a Worker can't call another Worker's public workers.dev
// address, and the internal connection is faster anyway).
//   /api/*  and  /images/*  ->  API Worker (the browser keeps using the same address, so
//                               sign-in cookies just work)
//   everything else          ->  the Next.js pages (vinext)
import vinext from "vinext/server/fetch-handler";
export * from "vinext/server/fetch-handler";

export default {
  async fetch(request, env, ctx) {
    // Pages that load data on the server (lib/api.js) use this same connection.
    globalThis.__SW_API = env.API;

    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/") || pathname.startsWith("/images/")) {
      // Tell the API the visitor used https, so it marks sign-in cookies "Secure".
      const forwarded = new Request(request);
      forwarded.headers.set("x-forwarded-proto", "https");
      return env.API.fetch(forwarded);
    }
    return vinext.fetch(request, env, ctx);
  },
};
