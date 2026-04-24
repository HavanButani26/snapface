import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // ✅ ADD THIS
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;