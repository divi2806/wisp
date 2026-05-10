import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.prod.website-files.com",
        pathname: "/691b836ec5fafc863304c0a5/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
