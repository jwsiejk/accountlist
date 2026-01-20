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
      issuer: { and: [/\.[jt]sx?$/] },
      use: [
        {
          loader: "worker-loader",
          options: {
            filename: "static/chunks/[name].[contenthash].worker.js",
            esModule: false,
          },
        },
        {
          loader: "babel-loader",
          options: {
            presets: ["next/babel"],
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
