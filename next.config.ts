import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger request bodies for file uploads (up to 10MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
