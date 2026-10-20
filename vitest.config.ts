import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const resolvePath = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    /*
     * `@shared/config/env` validates `process.env` with Zod at IMPORT time and requires a
     * `DATABASE_URL`, so every suite that transitively touches it died on
     * `ZodError: DATABASE_URL Required` — including `batch-flow.service.test.ts`. Vitest does
     * not read `.env`, and CI (`npm test` on a clean checkout) has no `.env` at all, so the
     * suite was red locally AND in the pipeline.
     *
     * The value is a DUMMY and is never dialled: every test here either mocks the repository
     * layer or stubs `@db/index` (`batch-flow.repository.test.ts`), and `getPgPool()` builds
     * its pool lazily on first query. An ambient `DATABASE_URL` still wins, so pointing the
     * suite at a real database remains possible.
     */
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/label_erp_test",
    },
  },
  // Mirror the tsconfig path aliases so tests resolve @shared/@modules/@db/@config too.
  resolve: {
    alias: {
      "@shared": resolvePath("./src/shared"),
      "@modules": resolvePath("./src/modules"),
      "@db": resolvePath("./src/shared/db"),
      "@config": resolvePath("./src/shared/config"),
    },
  },
});
