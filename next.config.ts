import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser preview uses 127.0.0.1 while the server binds 0.0.0.0.
  // Allow that development origin so client-side filters can hydrate.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
