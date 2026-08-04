import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const resolvePath = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  // Mirror the tsconfig path aliases so tests can import via @api/@db/@config too.
  resolve: {
    alias: {
      "@api": resolvePath("./src/api"),
      "@db": resolvePath("./src/db"),
      "@config": resolvePath("./src/config"),
    },
  },
});
