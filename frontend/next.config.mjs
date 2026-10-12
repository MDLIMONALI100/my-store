// API and photo requests from the browser are forwarded to the Express API
// (run `npm run dev` in ~/my-store/backend, it listens on port 8788).
const API_URL = process.env.API_URL || "http://localhost:8788";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/images/:path*", destination: `${API_URL}/images/:path*` },
    ];
  },
};

export default nextConfig;
