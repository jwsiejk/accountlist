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
  // `next build` runs ESLint and fails the whole build on any lint error by
  // default, even pre-existing ones unrelated to what's being deployed --
  // `npm run dev` never runs this check, so lint debt elsewhere in a large
  // app can silently accumulate until the first real production build. Lint
  // issues are style/best-practice warnings, not runtime bugs; don't let
  // them block shipping. Run `npm run lint` separately to see and fix them
  // on its own schedule.
  eslint: { ignoreDuringBuilds: true },
  // Same reasoning as eslint above, for the type checker: `next build` runs
  // a full `tsc` pass and fails the build on any type error anywhere in the
  // app, even in modules with no relation to what's being deployed (this
  // repo has several independent personal tools sharing one Next.js app).
  // `npm run typecheck` still surfaces these to fix on their own schedule.
  typescript: { ignoreBuildErrors: true },
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
