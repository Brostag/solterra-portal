import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  serverExternalPackages: ["@react-pdf/renderer", "@prisma/client"],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "ext.same-assets.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
