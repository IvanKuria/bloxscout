import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const coreSrc = fileURLToPath(new URL("./packages/core/src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Resolve `@bloxscout/core/<module>` and the `@bloxscout/core` barrel to
      // the package SOURCE rather than its built `dist`. This keeps the test
      // suite running against source (no stale-dist hazard, full coverage) and
      // lets vite resolve core's own runtime deps (undici, better-sqlite3,
      // lru-cache) from `packages/core/node_modules`, where pnpm installs them.
      {
        find: /^@bloxscout\/core\/(.*)$/,
        replacement: `${coreSrc}/$1.ts`,
      },
      {
        find: /^@bloxscout\/core$/,
        replacement: `${coreSrc}/index.ts`,
      },
    ],
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    // Integration tests run via the dedicated `test:integration` script (which
    // also passes `INTEGRATION=1`). The base `test` script excludes them via
    // its own `--exclude` flag in package.json so the path filter still works
    // when callers point vitest at `test/integration` explicitly.
    exclude: ["node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts", "packages/core/src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
    },
  },
});
