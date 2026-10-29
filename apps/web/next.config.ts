import type { NextConfig } from "next";
import os from "os";

function getLocalDevOrigins() {
  const origins = ["localhost:3000", "127.0.0.1:3000", "localhost", "127.0.0.1"];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        origins.push(iface.address);
        origins.push(`${iface.address}:3000`);
      }
    }
  }
  return origins;
}

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: false,
  allowedDevOrigins: getLocalDevOrigins(),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:4000/api/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
