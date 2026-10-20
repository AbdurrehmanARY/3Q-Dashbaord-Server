/**
 * Capture the schema-only baseline that fresh databases are provisioned from.
 *
 * The repo's migration chain cannot be replayed on an empty database (0018 is ALTER-only against
 * `production_batches`, but the only CREATE for that table lives in 0019; live also carries objects
 * no migration creates). A fresh database is therefore built from a dump of live:
 *
 *     npm run db:baseline                                   # writes scripts/baseline/live-schema.sql
 *     psql "$SCRATCH_URL" -f scripts/baseline/live-schema.sql
 *     node --env-file <scratch.env> scripts/reconcile-migrations.mjs --fresh
 *     npx drizzle-kit migrate                               # applies only newer migrations
 *
 * See memory-bank/migration-reconciliation.md for the evidence.
 *
 * `pg_dump` is looked up on PATH first, then in the usual Windows install location, because a
 * running PostgreSQL service does not put its client binaries on PATH.
 *
 * Run: node --env-file .env scripts/dump-baseline.mjs [--out=<file>] [--force]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Neither DIRECT_URL nor DATABASE_URL is set — run with --env-file .env");
  process.exit(1);
}

const outArg = process.argv.find((a) => a.startsWith("--out="));
const outFile = outArg
  ? path.resolve(outArg.slice("--out=".length))
  : path.join(serverDir, "scripts", "baseline", "live-schema.sql");

/**
 * Guard against a silent mis-target. Node's `--env-file` does NOT override a variable that is
 * already set in the environment, so a stale `DIRECT_URL` exported earlier in the shell silently
 * redirects this script — and dumping a scratch/dev database over the canonical baseline would
 * poison provisioning and the repo (this happened once, dumping a scratch DB with a probe table
 * in it). Refuse when the target is not the `DIRECT_URL` in `server/.env`, unless `--force`.
 */
function directUrlFromEnvFile() {
  const envPath = path.join(serverDir, ".env");
  if (!fs.existsSync(envPath)) return null;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (line.startsWith("DIRECT_URL=")) {
      return line.slice("DIRECT_URL=".length).trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return null;
}

const describe = (u) => `${u.hostname}:${u.port}${u.pathname}`;
const envFileUrl = directUrlFromEnvFile();
if (envFileUrl && !process.argv.includes("--force")) {
  const intended = new URL(envFileUrl);
  if (describe(intended) !== describe(new URL(url))) {
    console.error(`\nRefusing: target ${describe(new URL(url))} is not server/.env's DIRECT_URL`);
    console.error(`          (${describe(intended)}). A stale DIRECT_URL in the shell silently`);
    console.error("          redirects this script. Re-run with --force if that is really intended.");
    process.exit(1);
  }
}

/** Find pg_dump: PATH first, then the newest `C:\Program Files\PostgreSQL\<major>\bin`. */
function findPgDump() {
  const exe = process.platform === "win32" ? "pg_dump.exe" : "pg_dump";
  try {
    execFileSync(exe, ["--version"], { stdio: "ignore" });
    return exe;
  } catch {
    /* not on PATH — fall through to the install directory */
  }
  const root = "C:\\Program Files\\PostgreSQL";
  if (!fs.existsSync(root)) return null;
  const majors = fs
    .readdirSync(root)
    .filter((d) => /^\d+$/.test(d))
    .sort((a, b) => Number(b) - Number(a));
  for (const major of majors) {
    const candidate = path.join(root, major, "bin", exe);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const pgDump = findPgDump();
if (!pgDump) {
  console.error("pg_dump not found on PATH or in C:\\Program Files\\PostgreSQL\\*\\bin.");
  console.error("Install the PostgreSQL client tools, then re-run.");
  process.exit(1);
}

const [pgVersion] = execFileSync(pgDump, ["--version"], { encoding: "utf8" }).trim().split("\n");
console.log(`using   ${pgVersion.trim()}  (${pgDump})`);

const target = new URL(url);
console.log(`dumping ${target.hostname}:${target.port}${target.pathname} schema 'public' (schema only)`);
fs.mkdirSync(path.dirname(outFile), { recursive: true });

execFileSync(
  pgDump,
  // public only: the `drizzle` schema is the migration tracker, and drizzle-kit creates that
  // itself. No owners/privileges so the dump applies anywhere.
  ["--schema-only", "--no-owner", "--no-privileges", "-n", "public", "--file", outFile, url],
  { stdio: "inherit" }
);

// pg_dump always emits `CREATE SCHEMA public;`, which fails on a database that already has it.
// `public` exists in every new database, so the guard makes the baseline directly applicable.
const raw = fs.readFileSync(outFile, "utf8");
const patched = raw.replace("CREATE SCHEMA public;", "CREATE SCHEMA IF NOT EXISTS public;");
if (patched === raw) {
  console.warn("note: 'CREATE SCHEMA public;' was not found — the baseline may already be guarded");
} else {
  fs.writeFileSync(outFile, patched, "utf8");
}

const counts = {
  tables: (patched.match(/^CREATE TABLE /gm) ?? []).length,
  types: (patched.match(/^CREATE TYPE /gm) ?? []).length,
  indexes: (patched.match(/^CREATE (?:UNIQUE )?INDEX /gm) ?? []).length,
  constraints: (patched.match(/ ADD CONSTRAINT /g) ?? []).length,
};
console.log(
  `\nwrote ${path.relative(serverDir, outFile)} (${fs.statSync(outFile).size} B): ` +
    `${counts.tables} tables, ${counts.types} types, ${counts.indexes} indexes, ${counts.constraints} constraints`
);
