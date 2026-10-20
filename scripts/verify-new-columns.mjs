/**
 * verify-new-columns.mjs
 *
 * READ-ONLY check that the 0027 + 0028 migration changes reached the live DB:
 *   - production_batches.waste_reason (new varchar column)
 *   - work_orders.dc_image_url     (new text column)
 *   - production_batches_waste_first_stage_only CHECK should be GONE
 *
 * Usage: node scripts/verify-new-columns.mjs
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
  const cols = await sql`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name IN ('production_batches','work_orders')
      AND column_name IN ('waste_reason','dc_image_url')
    ORDER BY table_name, column_name
  `;
  console.log("--- new columns present? ---");
  for (const row of cols) {
    console.log(`${row.table_name}.${row.column_name}: ${row.data_type}, nullable=${row.is_nullable}`);
  }
  if (cols.length === 0) {
    console.log("❌ NO matching columns found — migrations may not have applied!");
  }

  const check = await sql`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'production_batches'::regclass
      AND conname = 'production_batches_waste_first_stage_only'
  `;
  console.log("\n--- old waste CHECK still present? ---");
  if (check.length > 0) {
    console.log("❌ production_batches_waste_first_stage_only still EXISTS — 0027 did not drop it!");
  } else {
    console.log("✅ production_batches_waste_first_stage_only is GONE — 0027 applied correctly");
  }

  const applied = await sql`
    SELECT id, created_at FROM drizzle.__drizzle_migrations
    WHERE id >= 27
    ORDER BY id DESC
  `;
  console.log("\n--- migrations 0027+ in __drizzle_migrations ---");
  for (const row of applied) {
    console.log(`${row.id} | ${row.created_at}`);
  }
  if (applied.length === 0) {
    console.log("❌ No migration rows ≥ idx 27 found!");
  }
} finally {
  await sql.end();
}
