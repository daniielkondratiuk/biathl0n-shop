import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n/request.ts",
});

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://192.168.1.207:3000",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kiekkokingi.fi",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "innerdecay.com",
        pathname: "/**",
      },
    ],
    // Allow local images from /uploads
    unoptimized: false,
  },
};

export default withNextIntl(nextConfig);
