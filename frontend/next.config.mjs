// TEMPORARY (until Step 5): send API and image requests to the old Worker
// (run `npm run dev` in ~/my-store, it listens on port 8787).
const OLD_WORKER = process.env.OLD_WORKER_URL || "http://localhost:8787";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${OLD_WORKER}/api/:path*` },
      { source: "/images/:path*", destination: `${OLD_WORKER}/images/:path*` },
    ];
  },
};

export default nextConfig;
