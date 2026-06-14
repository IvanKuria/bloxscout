import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@bloxscout/core` is a server-only package: it pulls in undici, node:zlib,
  // and the native `better-sqlite3` binding. Keep it out of the bundler so the
  // native module loads at runtime and Node built-ins resolve correctly. It is
  // only ever imported from Server Components / Route Handlers (never client).
  serverExternalPackages: ["@bloxscout/core", "better-sqlite3"],
};

export default nextConfig;
