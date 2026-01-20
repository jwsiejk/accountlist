/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/partner-hub";

const nextConfig = {
  reactStrictMode: true,
  basePath,
  images: { unoptimized: true },
  trailingSlash: false,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.worker\.ts$/,
      use: [
        {
          loader: "worker-loader",
          options: {
            filename: "static/chunks/[name].[contenthash].worker.js",
            esModule: true,
          },
        },
      ],
    });

    return config;
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
