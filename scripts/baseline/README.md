# Baseline — how a fresh database is provisioned

`live-schema.sql` is a **schema-only dump of the production (Supabase) database** (`public` schema
only) and is the starting point for any new database. It exists because the repo's migration chain
**cannot be replayed on an empty database**:

- `0018_batch_material_flow.sql` is ALTER-only against `production_batches`, but the only
  `CREATE TABLE production_batches` in the chain lives in `0019` — so a replay dies at `0018`;
- live also carries objects that **no migration creates**: `production_batches.production_order_id`
  (+ FK `production_batches_order_fk`, unique `production_batches_id_order_uq`),
  `production_batches_first_stage_one_line`, `production_batches_order_stage_no_uq`,
  `production_batches_printed_no_uq`, `production_batches_woven_no_uq`,
  `production_batches_woven_line_stage_no_uq`;
- conversely, `0018`'s `production_batches_line_stage_no_uq` / `0019`'s
  `production_batches_id_line_stage_uq` do **not** exist on live.

Replaying `0000`–`0024` is therefore an **audit path only** — never the provisioning path.
See `memory-bank/migration-reconciliation.md` for the full evidence.

## Procedure

```bash
cd server

# 1. refresh the baseline from live (needs pg_dump; the script finds it, even off PATH)
npm run db:baseline

# 2. apply it to the empty target database
psql "$SCRATCH_URL" -f scripts/baseline/live-schema.sql

# 3. tell drizzle the baseline already covers every journal entry
#    (point DIRECT_URL at the target: an .env file, or export it in the shell)
node --env-file <scratch.env> scripts/reconcile-migrations.mjs --fresh

# 4. drizzle-kit migrate now applies ONLY genuinely-new migrations
npx drizzle-kit migrate
```

Step 3 records every journal entry as `baseline:<tag>`. `--fresh` **refuses** when the tracker
already holds rows (that database is not fresh), so it cannot be run against live by accident.

## Notes

- The file is generated. Its only edit is `CREATE SCHEMA public;` →
  `CREATE SCHEMA IF NOT EXISTS public;`, so it applies to a database that already has `public`.
  The generator does that automatically.
- `npm run db:baseline` refuses when `DIRECT_URL` is not the one in `server/.env`, because Node's
  `--env-file` does **not** override an already-exported variable — a stale `DIRECT_URL` would
  otherwise dump the wrong database over this file. Use `--force` to override deliberately.
- The `drizzle` schema (the migration tracker) is deliberately **not** in the dump; drizzle-kit
  creates it.
- Counts at capture time: 34 tables, 17 enums, 81 indexes, 104 named constraints.
