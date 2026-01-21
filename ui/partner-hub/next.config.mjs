/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/partner-hub";

// Next.js dev server will block cross-origin requests for /_next/* assets unless
// the origin is explicitly allow-listed via `allowedDevOrigins`.
//
// Set ALLOWED_DEV_ORIGINS as a comma-separated list, for example:
//   ALLOWED_DEV_ORIGINS=https://<your-subdomain>.ngrok-free.dev
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig = {
  reactStrictMode: true,
  // Keep localhost allowed implicitly, and add any explicit external dev origins (ngrok, etc.).
  allowedDevOrigins,
  basePath,
  images: { unoptimized: true },
  trailingSlash: false,
  async redirects() {
    return [
      {
        source: "/estimator",
        destination: "/accountmap",
        permanent: true,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
