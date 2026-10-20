// Migration bookkeeping maintenance (live DB) and provisioning (fresh DBs).
//
// Why a baseline instead of a replay: the repo's chain cannot be replayed from 0000 on an empty
// database. 0018 is ALTER-only against `production_batches`, but the only CREATE for that table
// lives in 0019 — so 0018 dies on a fresh DB. Live additionally carries objects that no migration
// creates (`production_order_id`, `first_stage_one_line`, `order_stage_no_uq`, `printed_no_uq`,
// `woven_no_uq`, `woven_line_stage_no_uq`). A fresh database is therefore provisioned from a
// schema-only pg_dump of live:
//
//   1. psql "$SCRATCH_URL" -f server/scripts/baseline/live-schema.sql
//   2. node --env-file <scratch env> server/scripts/reconcile-migrations.mjs --fresh
//   3. npx drizzle-kit migrate     # applies only migrations newer than the baseline
//
// See memory-bank/migration-reconciliation.md for the evidence behind this.
//
// Modes (the default is a dry run — nothing is written without a mode flag):
//   --write   record migrations applied out-of-band as "pre-applied:<tag>", skipping the newest
//             entry so drizzle-kit migrate still runs that one for real
//   --fresh   a database that already carries the baseline: create the tracker if absent, then
//             record EVERY journal entry as "baseline:<tag>". Refuses when the tracker is not
//             empty (that means the database is not fresh) unless --force is given.
//
// Run: node --env-file server/.env server/scripts/reconcile-migrations.mjs [--write|--fresh] [--force]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { default: postgres } = await import(
  pathToFileURL(path.join(serverDir, "node_modules", "postgres", "src", "index.js")).href
);

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Neither DIRECT_URL nor DATABASE_URL is set — run with --env-file .env");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

const journal = JSON.parse(
  fs.readFileSync(path.join(serverDir, "drizzle", "meta", "_journal.json"), "utf8")
);

const mode = process.argv.includes("--fresh")
  ? "fresh"
  : process.argv.includes("--write")
    ? "write"
    : "dry";
const force = process.argv.includes("--force");

/** Always name the database being touched — live and a scratch DB look alike otherwise. */
const [where] = await sql`select current_database() as db, inet_server_addr()::text as host`;
console.log(
  `database ${where.db} at ${where.host ?? "local socket"}   mode=${mode}${force ? " --force" : ""}\n`
);

/* --- the tracker: what is recorded, and does it exist at all ----------------------------- */
let trackerExists = (
  await sql`select to_regclass('drizzle.__drizzle_migrations') is not null as present`
)[0].present;

if (!trackerExists && mode === "fresh") {
  await sql`create schema if not exists drizzle`;
  await sql`
    create table if not exists drizzle."__drizzle_migrations" (
      id serial primary key not null,
      hash text not null,
      created_at bigint
    )
  `;
  trackerExists = true;
  console.log('created drizzle."__drizzle_migrations" (drizzle-kit\'s own shape)\n');
}

if (!trackerExists) {
  console.log('drizzle."__drizzle_migrations" does not exist: this database has never been migrated.');
  console.log("Nothing to reconcile. Use --fresh to provision from the baseline.");
  await sql.end();
  process.exit(0);
}

const recorded =
  await sql`select id, hash, created_at from drizzle.__drizzle_migrations order by created_at`;
console.log(`recorded in DB: ${recorded.length} row(s)`);
for (const r of recorded) {
  console.log("  id=" + r.id, "created_at=" + r.created_at, "hash=" + String(r.hash).slice(0, 12) + "…");
}

const recordedWhen = new Set(recorded.map((r) => Number(r.created_at)));
const missing = journal.entries.filter((e) => !recordedWhen.has(Number(e.when)));
const newestIdx = Math.max(...journal.entries.map((e) => e.idx));

console.log("\njournal entries NOT recorded in DB:");
for (const e of missing) console.log("  idx=" + e.idx, "when=" + e.when, e.tag);
if (missing.length === 0) console.log("  (none)");

/* --- modes ------------------------------------------------------------------------------ */
if (mode === "fresh") {
  // A non-empty tracker means this database has been migrated before, so the baseline does NOT
  // cover it — recording everything as applied here would silently hide pending migrations.
  if (recorded.length > 0 && !force) {
    console.error(
      `\nRefusing: ${recorded.length} migration(s) are already recorded, so this database is not fresh.`
    );
    console.error("A freshly provisioned database carries the baseline but an EMPTY tracker.");
    console.error("Pass --force only if you know the baseline already covers every journal entry.");
    await sql.end();
    process.exit(1);
  }
  for (const e of journal.entries) {
    await sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${"baseline:" + e.tag}, ${e.when})`;
  }
  console.log(
    `\nrecorded all ${journal.entries.length} entries as baseline (idx ${journal.entries[0].idx}–${journal.entries[journal.entries.length - 1].idx}).`
  );
  console.log("`npx drizzle-kit migrate` will now apply only migrations newer than the baseline.");
} else if (mode === "write") {
  if (missing.length === 0) {
    console.log("\nnothing to record.");
  } else {
    // Hash is NOT NULL; drizzle orders by `created_at` (the journal `when`), never by hash, so a
    // placeholder is safe for an entry that is genuinely applied.
    for (const e of missing) {
      if (e.idx === newestIdx) {
        console.log("skipped (newest — let drizzle-kit migrate run it for real):", e.tag);
        continue;
      }
      await sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${"pre-applied:" + e.tag}, ${e.when})`;
      console.log("recorded pre-applied migration:", e.tag);
    }
  }
} else if (missing.length > 0) {
  console.log("\ndry run — pass --write to record the pre-applied ones, or --fresh to provision a new DB.");
} else {
  console.log("\nnothing missing: the tracker and the journal agree.");
}

await sql.end();
