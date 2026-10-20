import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// `dotenv/config` guarantees DATABASE_URL is loaded from .env when drizzle-kit runs
// (db:generate / db:migrate / db:push), independent of its own env-loading behaviour.
export default defineConfig({
  schema: "./src/shared/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Prefer the session pooler (DIRECT_URL) for DDL; fall back to DATABASE_URL locally.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
