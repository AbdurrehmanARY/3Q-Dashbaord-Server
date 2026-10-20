/**
 * Applies a numbered Drizzle migration SQL file directly to the database.
 *
 * Usage:  npx tsx src/db/apply-migration.ts 0023
 *
 * Reads drizzle/<nnnn>_<name>.sql, splits on "--> statement-breakpoint",
 * and executes each statement against the DB using the DIRECT_URL
 * (session pooler — required for DDL like ALTER TABLE / CREATE INDEX).
 *
 * IMPORTANT: this bypasses drizzle-kit on purpose. Earlier migrations
 * (0018, 0020, 0021, 0022) are missing from _journal.json snapshots, so
 * `drizzle-kit db:migrate` would abort. This script applies ONLY the
 * specified migration, idempotently.
 */
import postgres from "postgres";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationNumber = process.argv[2];
if (!migrationNumber) {
  console.error("Usage: npx tsx src/db/apply-migration.ts <nnnn>");
  console.error("  e.g. npx tsx src/db/apply-migration.ts 0023");
  process.exit(1);
}

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error("ERROR: DIRECT_URL environment variable is not set.");
  console.error("  The session pooler connection is required for DDL (ALTER TABLE, CREATE INDEX, etc.).");
  console.error("  Set DIRECT_URL in .env (port 5432, not the transaction pooler port 6543).");
  process.exit(1);
}

const migrationDir = join(__dirname, "../../drizzle");

if (!existsSync(migrationDir)) {
  console.error(`ERROR: migration directory not found: ${migrationDir}`);
  process.exit(1);
}

const files = readdirSync(migrationDir).filter((f) => f.startsWith(`${migrationNumber}_`));

if (files.length === 0) {
  console.error(`ERROR: no migration file found matching "${migrationNumber}_*.sql" in ${migrationDir}`);
  process.exit(1);
}
if (files.length > 1) {
  console.error(`ERROR: multiple migration files match "${migrationNumber}_*.sql": ${files.join(", ")}`);
  process.exit(1);
}

const sqlPath = join(migrationDir, files[0]);
// Redact password in the log line.
const maskedUrl = directUrl.replace(/:\/\/[^:]+:([^@]+)@/, "://[user]:[password]@");
console.log(`Applying migration ${migrationNumber}: ${files[0]}`);
console.log(`  target: ${maskedUrl}`);

const raw = readFileSync(sqlPath, "utf-8");

// Split on drizzle-kit's statement breakpoint comments.
// "--> statement-breakpoint" is inserted by drizzle-kit between each DDL statement.
const statements = raw
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`  ${statements.length} statement(s) to execute`);

const client = postgres(directUrl, {
  prepare: false, // session pooler / DDL requires this
  max: 1,
});

let applied = 0;
let failed = 0;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  try {
    await client.unsafe(stmt);
    applied++;
    // Print a hint about what the statement did (first meaningful comment line).
    const firstLine = stmt.split("\n").find((l) => l.trimStart().startsWith("--"))?.trimStart().slice(2).trim() ?? "";
    if (firstLine) console.log(`  [${i + 1}/${statements.length}] ${firstLine.slice(0, 80)}`);
    else console.log(`  [${i + 1}/${statements.length}] (executed)`);
  } catch (err: unknown) {
    failed++;
    const message = err && typeof err === "object" && "message" in err
      ? (err as { message: string }).message
      : String(err);
    console.error(`  [${i + 1}/${statements.length}] FAILED:`);
    console.error(`    ${message.split("\n")[0].slice(0, 200)}`);
    // Continue with remaining statements unless it's fatal (connection-level).
    if (message.includes("connection") || message.includes("password") || message.includes("timeout")) {
      console.error("  FATAL connection error — aborting.");
      await client.end();
      process.exit(1);
    }
  }
}

await client.end();

console.log(`\nDone. Applied: ${applied}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
