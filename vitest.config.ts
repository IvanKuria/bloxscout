import { defineConfig } from "vitest/config";

export default defineConfig({
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
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
    },
  },
});
