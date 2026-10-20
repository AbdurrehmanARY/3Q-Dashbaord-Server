import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import postgres from "postgres";

/* Repeatable, LOCAL-ONLY validation of `drizzle/0025_line_scoped_cutting_packaging.sql`.
 *
 * It provisions `q3_0025_scratch` on localhost from `scripts/baseline/live-schema.sql`, seeds
 * exactly the shape the migration has to repair (one order, two label types, line-less cutting
 * and packaging batches, plus their consumption edges), runs the migration and asserts:
 *
 *   phase 1  the DDL swap, the backfill (largest contributor wins; packaging inherits its
 *            cutting batch's line) and the "no orphan survived" state — COMMITTED
 *   phase 2  the orphan guard refuses to continue while a batch carries no line — ROLLED BACK
 *   phase 3  the new CHECK accepts a line-bearing cutting batch and rejects a line-less one —
 *            ROLLED BACK
 *   phase 4  batch_number stays unique per (line, stage) for cutting — ROLLED BACK
 *
 * The scratch database is dropped at the end. The script refuses to run unless
 * LOCAL_DATABASE_URL points at localhost, so it can never touch Supabase.
 *
 * Usage (from server/):  node scripts/verify-0025-line-scoped.mjs [outfile]
 */
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(process.cwd(), ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
    })
);

const local = env.LOCAL_DATABASE_URL;
if (!local || !local.includes("localhost")) {
  console.error("refusing: LOCAL_DATABASE_URL is not localhost");
  process.exit(1);
}

const DB = "q3_0025_scratch";
/** `postgres://host:port` — the URL minus its database path (`origin` is "null" for postgres://). */
const origin = local.slice(0, local.lastIndexOf("/"));
const admin = postgres(`${origin}/postgres`, { prepare: false, max: 1 });
const log = [];
const say = (s) => {
  console.log(s);
  log.push(s);
};

try {
  await admin.unsafe(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE ${DB}`);
  say(`created scratch database ${DB} on localhost`);

  const sql = postgres(`${origin}/${DB}`, { prepare: false, max: 1 });
  try {
    const baseline = fs
      .readFileSync(path.join(process.cwd(), "scripts", "baseline", "live-schema.sql"), "utf8")
      /* pg_dump 17+ emits `\restrict` / `\unrestrict`, which only psql understands. */
      .replace(/^\\(?:un)?restrict.*$/gm, "");
    await sql.unsafe(baseline);
    /* The dump clears `search_path` for its own session; put it back for ours. */
    await sql.unsafe(`SET search_path = public, pg_catalog`);
    say("baseline schema loaded");

    /* ---- seed: exactly the shape 0025 has to repair ---- */
    await sql.unsafe(`
      INSERT INTO work_orders (id, so_number, order_date, total_qty, product_type)
      VALUES (900001, '__0025__', CURRENT_DATE, 1000, 'printed');

      INSERT INTO production_orders (id, production_number, work_order_id, total_qty)
      VALUES (900001, '__0025__', 900001, 1000);

      -- order 900001 has TWO label types; line 900001 prints 30, line 900002 prints 70
      INSERT INTO production_order_lines
        (id, production_order_id, label_type, quantity, label_size, required_rolls, total_rolls)
      VALUES (900001, 900001, 'Care Label',  300, 20, 30, 30),
             (900002, 900001, 'Size Label',  700, 20, 70, 70);

      INSERT INTO production_batches
        (id, production_order_id, production_order_line_id, stage, batch_number, batch_code,
         assigned_rolls, produced_rolls)
      VALUES (900001, 900001, 900001, 'printing', 1, 'P-CARE', 30, 30),
             (900004, 900001, 900002, 'printing', 1, 'P-SIZE', 70, 70);

      -- line-less cutting fed by BOTH lines: 30 from Care, 70 from Size -> must become Size's
      INSERT INTO production_batches
        (id, production_order_id, stage, batch_number, batch_code, assigned_rolls)
      VALUES (900002, 900001, 'cutting', 1, 'C-TEST', 100),
             (900003, 900001, 'packaging', 1, 'PK-TEST', 100);

      INSERT INTO batch_consumptions
        (destination_batch_id, source_batch_id, source_stage, destination_stage, rolls,
         production_order_id)
      VALUES (900002, 900001, 'printing', 'cutting', 30, 900001),
             (900002, 900004, 'printing', 'cutting', 70, 900001),
             (900003, 900002, 'cutting', 'packaging', 100, 900001);
    `);
    say("seeded: a 2-label-type order whose cutting + packaging batches carry NO line");

    const ddl = fs.readFileSync(
      path.join(process.cwd(), "drizzle", "0025_line_scoped_cutting_packaging.sql"),
      "utf8"
    );

    /* ---------------- phase 1: the migration, committed ---------------- */
    await sql.begin(async (tx) => {
      await tx.unsafe(ddl);
    });
    say("\n--- phase 1: 0025 applied in one transaction ---");

    const checks = await sql`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'production_batches'::regclass AND contype = 'c' ORDER BY conname`;
    const checkNames = checks.map((r) => r.conname);
    say(`checks: ${checkNames.join(", ")}`);
    const idx = await sql`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'production_batches' AND indexname LIKE '%no_uq%' ORDER BY indexname`;
    const idxNames = idx.map((r) => r.indexname);
    say(`numbering indexes: ${idxNames.join(", ")}`);

    const assert = (cond, label) => {
      if (!cond) throw new Error(`ASSERTION FAILED: ${label}`);
      say(`ok   ${label}`);
    };
    assert(checkNames.includes("production_batches_one_line"), "new CHECK production_batches_one_line exists");
    assert(!checkNames.includes("production_batches_first_stage_one_line"), "old CHECK production_batches_first_stage_one_line is gone");
    assert(!idxNames.includes("production_batches_order_stage_no_uq"), "order-scoped numbering index is gone");
    assert(idxNames.includes("production_batches_printed_no_uq"), "printed per-line numbering index exists");
    assert(idxNames.includes("production_batches_woven_no_uq"), "woven per-line numbering index exists");

    const rows = await sql`
      SELECT b.id, b.stage, b.batch_code,
             COALESCE(b.production_order_line_id, b.woven_production_line_id) AS line_id,
             COALESCE(b.production_order_line_id, b.woven_production_line_id) IS NOT NULL AS has_line,
             l.label_type
      FROM production_batches b
      LEFT JOIN production_order_lines l ON l.id = b.production_order_line_id
      ORDER BY b.id`;
    for (const r of rows) {
      say(`  batch ${r.id} ${r.batch_code} (${r.stage}) -> line ${r.line_id ?? "NONE"}${r.label_type ? ` · ${r.label_type}` : ""}`);
    }
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    assert(rows.every((r) => r.has_line), "no line-less batch survived the backfill");
    assert(byId[900002]?.label_type === "Size Label", "cutting took the line of its LARGEST contributor (70 > 30)");
    assert(byId[900003]?.label_type === "Size Label", "packaging inherited its cutting batch's line");

    /* ------------- phase 2: the orphan guard must refuse to continue ------------- */
    say("\n--- phase 2: orphan guard (must RAISE, then roll back) ---");
    let guardFired = false;
    let guardMessage = "";
    try {
      await sql.begin(async (tx) => {
        /* Recreate the moment inside the migration: the order-scoped CHECK is already gone
           (step 0 dropped it) and the line-scoped one does not exist yet. */
        await tx.unsafe(`ALTER TABLE production_batches DROP CONSTRAINT IF EXISTS production_batches_one_line`);
        await tx.unsafe(`
          INSERT INTO work_orders (id, so_number, order_date, total_qty, product_type)
          VALUES (900010, '__0025_orphan__', CURRENT_DATE, 1, 'printed');
          INSERT INTO production_orders (id, production_number, work_order_id, total_qty)
          VALUES (900010, '__0025_orphan__', 900010, 1);
          INSERT INTO production_batches (id, production_order_id, stage, batch_number, batch_code)
          VALUES (900011, 900010, 'cutting', 1, 'C-ORPHAN');
        `);
        await tx.unsafe(ddl);
      });
    } catch (e) {
      guardMessage = e.message.split("\n")[0];
      guardFired = /still carry no line/.test(e.message);
    }
    say(`guard said: ${guardMessage}`);
    assert(guardFired, "0025 refuses to continue while a batch has no line");

    /* ---------------- phase 3: the new CHECK, round-tripped ---------------- */
    say("\n--- phase 3: the new CHECK (both probes rolled back) ---");
    let accepted = false;
    let rejectedMsg = "";
    try {
      await sql.begin(async (tx) => {
        await tx`
          INSERT INTO production_batches
            (id, production_order_id, production_order_line_id, stage, batch_number, batch_code)
          VALUES (900020, 900001, 900001, 'cutting', 42, 'C-WITH-LINE')`;
        accepted = true;
        try {
          await tx`
            INSERT INTO production_batches
              (id, production_order_id, stage, batch_number, batch_code)
            VALUES (900021, 900001, 'cutting', 43, 'C-NO-LINE')`;
        } catch (e) {
          rejectedMsg = e.message;
        }
        throw new Error("__ROLLBACK__");
      });
    } catch (e) {
      if (e.message !== "__ROLLBACK__") throw e;
    }
    assert(accepted, "a cutting batch WITH a line is accepted by production_batches_one_line");
    assert(
      /production_batches_one_line/.test(rejectedMsg),
      `a line-less cutting batch is rejected (${rejectedMsg.split("\n")[0] || "NOT REJECTED"})`
    );

    /* --------- phase 4: per-LINE numbering now covers cutting/packaging --------- */
    say("\n--- phase 4: batch_number is unique per (line, stage) for cutting ---");
    let nextNumberAccepted = false;
    let duplicateMsg = "";
    try {
      await sql.begin(async (tx) => {
        await tx`
          INSERT INTO production_batches
            (id, production_order_id, production_order_line_id, stage, batch_number, batch_code)
          VALUES (900030, 900001, 900002, 'cutting', 2, 'C-NEXT')`;
        nextNumberAccepted = true;
        try {
          /* 900002 already took number 1 on this line's cutting stage */
          await tx`
            INSERT INTO production_batches
              (id, production_order_id, production_order_line_id, stage, batch_number, batch_code)
            VALUES (900031, 900001, 900002, 'cutting', 1, 'C-DUP')`;
        } catch (e) {
          duplicateMsg = e.message;
        }
        throw new Error("__ROLLBACK__");
      });
    } catch (e) {
      if (e.message !== "__ROLLBACK__") throw e;
    }
    assert(nextNumberAccepted, "the next number on that line+stage is accepted");
    assert(
      /production_batches_printed_no_uq|duplicate key/.test(duplicateMsg),
      `a repeat of that number is refused (${duplicateMsg.split("\n")[0] || "NOT REFUSED"})`
    );

    say("\nALL SCRATCH CHECKS PASSED");
  } finally {
    await sql.end();
  }
} catch (e) {
  say(`\nERROR: ${e.message}`);
  log.push(String(e.stack ?? ""));
} finally {
  await admin.unsafe(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await admin.end();
  const outfile =
    process.argv[2] ?? path.join(os.tmpdir(), "verify-0025-line-scoped.txt");
  fs.writeFileSync(outfile, log.join("\n"));
  console.log(`\nlog written to ${outfile}`);
}
