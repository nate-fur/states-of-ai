import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser preview uses 127.0.0.1 while the server binds 0.0.0.0.
  // Allow that development origin so client-side filters can hydrate.
  allowedDevOrigins: ["127.0.0.1"],
  // First-party proxy for PostHog (see src/instrumentation-client.ts).
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // PostHog's API paths end in a slash; don't redirect them away.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
