import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globals: true,
    setupFiles: ["test/setup/env.ts"],
    // Integration tests spin up an in-memory MongoDB; give them room.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
