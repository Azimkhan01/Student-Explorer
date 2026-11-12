
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },

  allowedDevOrigins: [
    "192.168.0.109",
    "*.trycloudflare.com",
    "student.daddubhai.shop",
  ],

  cacheComponents: true,
  partialPrefetching: true,

  async rewrites() {
    return [
      {
        source: "/server/socket.io",
        destination: "http://localhost:3000/socket.io/",
      },
      {
        source: "/server/socket.io/:path*",
        destination: "http://localhost:3000/socket.io/:path*",
      },
      {
        source: "/server/:path*",
        destination: "http://localhost:3000/:path*",
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
