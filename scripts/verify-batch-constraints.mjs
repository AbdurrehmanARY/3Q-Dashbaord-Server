/**
 * verify-batch-constraints.mjs
 *
 * READ-ONLY diagnostic. Prints the live `production_batches` constraints and indexes so we
 * can tell which line-scoping rule the database actually enforces:
 *
 *   production_batches_one_line              -> exactly ONE line per batch (line-scoped)  ← target
 *   production_batches_first_stage_one_line  -> line only for the first stage (order-scoped)
 *
 * Migration `0025_line_scoped_cutting_packaging.sql` is the one that swaps the second for the
 * first and drops the order-scoped numbering index, so this script answers the only question
 * that matters after a deploy: HAS 0025 BEEN APPLIED YET? (The chain was already not
 * self-consistent before it — 0023 drops `production_batches_first_stage_one_line` and
 * re-adds `production_batches_one_line`, a name 0023 never creates — so files on disk cannot
 * tell us the live state; only this query can.)
 *
 * Usage:  node scripts/verify-batch-constraints.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(here, "..", ".env");

if (!fs.existsSync(envPath)) {
  console.error(`No .env at ${envPath}`);
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^['"]|['"]$/g, "")];
    })
);

const url = env.DIRECT_URL || env.DATABASE_URL;
if (!url) {
  console.error("Neither DIRECT_URL nor DATABASE_URL is set in server/.env");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

try {
  const constraints = await sql`
    SELECT conname, contype, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'production_batches'::regclass
    ORDER BY conname
  `;
  console.log("--- production_batches constraints ---");
  for (const row of constraints) {
    console.log(`${row.contype} | ${row.conname} | ${row.def.replace(/\s+/g, " ")}`);
  }

  const indexes = await sql`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'production_batches'
    ORDER BY indexname
  `;
  console.log("\n--- production_batches indexes ---");
  console.log(indexes.map((r) => r.indexname).join("\n"));

  const nulls = await sql`
    SELECT stage,
           COUNT(*) AS batches,
           COUNT(*) FILTER (
             WHERE production_order_line_id IS NULL AND woven_production_line_id IS NULL
           ) AS line_less
    FROM production_batches
    GROUP BY stage
    ORDER BY stage
  `;
  console.log("\n--- existing batches per stage (are any line-less?) ---");
  for (const row of nulls) {
    console.log(`${row.stage}: ${row.batches} batches, ${row.line_less} with NO line`);
  }

  const applied = await sql`
    SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 5
  `;
  console.log("\n--- last 5 applied migrations ---");
  for (const row of applied) {
    console.log(`${row.id} | ${row.created_at?.toISOString?.() ?? row.created_at}`);
  }
} finally {
  await sql.end();
}
