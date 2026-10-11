export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ message: "Hello from my-store API" });
    }

    return env.ASSETS.fetch(request);
  },
};
