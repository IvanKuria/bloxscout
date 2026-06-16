import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@bloxscout/core` is a server-only package: it pulls in undici, node:zlib,
  // and the native `better-sqlite3` binding. Keep it out of the bundler so the
  // native module loads at runtime and Node built-ins resolve correctly. It is
  // only ever imported from Server Components / Route Handlers (never client).
  serverExternalPackages: ["@bloxscout/core", "better-sqlite3"],

  // PostHog reverse proxy: the browser SDK posts to first-party `/ingest/*`
  // paths so ad blockers (which blocklist *.posthog.com) don't drop events.
  // Next rewrites them to PostHog's US ingestion + asset hosts server-side.
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
  // Required so PostHog's trailing-slash API requests aren't redirected away.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
