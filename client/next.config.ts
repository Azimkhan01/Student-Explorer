import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  allowedDevOrigins: ["192.168.0.109", "*.trycloudflare.com"],
  cacheComponents: true,
  partialPrefetching: true,

  async rewrites() {
    
    return [
      {
        source: "/server/:path*",
        destination: `${process.env.BACKEND_SERVER}/:path*`,
      },
    ];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;