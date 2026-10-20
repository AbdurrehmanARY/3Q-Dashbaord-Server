/**
 * verify-batch-visibility.mjs
 *
 * READ-ONLY gate for the predicates behind "cutting and packaging batches are invisible".
 * It answers, against the LIVE database, the questions the client and the API ask — and prints
 * PASS/FAIL for each, so a regression shows up here instead of on the floor.
 *
 *   1. batch counts per (order, stage)  -> anything to see at all, and does EVERY batch carry a
 *                                          line? Since 0025 all four stages are line-scoped, so
 *                                          a line-less cutting batch is a defect, not a design.
 *   2. findByLine(<line>, 'weaving')    -> the line-scoped read of a first stage
 *   3. findByOrder(<order>, 'cutting')  -> the order-wide read that feeds the flow endpoint
 *   4. findByLine(<line>, 'cutting')    -> the line-scoped read of a SHARED stage. Before 0025
 *                                          this was FAIL-BY-DESIGN (an order-scoped batch carries
 *                                          no line); now it must answer, which is the point.
 *   5. per-line cut/packaged figures    -> a plain SUM over the line's own batches. The pro-rata
 *                                          `labelMix` attribution went away with 0025.
 *
 * Usage (from server/):  npm run verify:batch-visibility [orderId]
 *                         (no argument = the newest production order)
 * NOTE: this script loads server/.env itself, so node --env-file is NOT needed.
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

/**
 * The order to inspect: the caller's argument, else the newest order on the database.
 *
 * This used to hard-code `22` (the order the bug was reported against). Once that order stopped
 * existing — it has; the live database now starts at a later id — the documented no-argument
 * invocation failed with "No production order 22", i.e. a green gate went red for no reason.
 */
const requested = process.argv[2];
const parsed = requested === undefined ? Number.NaN : Number(requested);
const orderId = Number.isFinite(parsed)
  ? parsed
  : ((await sql`SELECT id FROM production_orders ORDER BY id DESC LIMIT 1`)[0]?.id ?? 22);

let failures = 0;
const report = (ok, label, value) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}            ${label.padEnd(48)} = ${value}`);
};

try {
  const order = await sql`
    SELECT o.id, w.product_type AS kind
    FROM production_orders o
    JOIN work_orders w ON w.id = o.work_order_id
    WHERE o.id = ${orderId}
  `;
  if (order.length === 0) {
    console.error(`No production order ${orderId}`);
    process.exit(1);
  }
  const kind = order[0].kind === "woven" ? "woven" : "printed";
  const first = kind === "woven" ? "weaving" : "printing";
  const lineTable = kind === "woven" ? "woven_production_lines" : "production_order_lines";
  console.log(`order ${orderId} · ${kind} · first stage ${first}\n`);

  /* --- 1. what exists per stage, and how many rows carry no line --- */
  const perStage = await sql`
    SELECT stage, COUNT(*)::int AS batches,
           COUNT(*) FILTER (
             WHERE production_order_line_id IS NULL AND woven_production_line_id IS NULL
           )::int AS line_less
    FROM production_batches
    WHERE production_order_id = ${orderId}
    GROUP BY stage
    ORDER BY stage
  `;
  console.log("--- batches per stage (line_less must be 0 for every stage) ---");
  for (const row of perStage) {
    console.log(`${row.stage.padEnd(10)} ${row.batches} batches, ${row.line_less} with NO line`);
  }
  for (const row of perStage) {
    report(
      row.line_less === 0,
      `${row.stage}: every batch carries a line`,
      `${row.batches - row.line_less}/${row.batches}`
    );
  }

  /* --- 2 + 3. the two read paths, exactly as the repository builds them --- */
  const lineId = (
    await sql`
      SELECT id FROM ${sql(lineTable)}
      WHERE production_order_id = ${orderId}
      ORDER BY id
      LIMIT 1
    `
  )[0]?.id;

  if (lineId === undefined) {
    console.log(`\nNo ${lineTable} row on order ${orderId} — skipping the read-path checks.`);
  } else {
    const column = kind === "woven" ? "woven_production_line_id" : "production_order_line_id";

    const byLine = await sql`
      SELECT COUNT(*)::int AS n FROM production_batches
      WHERE ${sql(column)} = ${lineId} AND stage = ${first}
    `;
    report(byLine[0].n > 0, `findByLine(${lineTable} ${lineId},'${first}')`, byLine[0].n);

    const cuttingByOrder = await sql`
      SELECT COUNT(*)::int AS n FROM production_batches
      WHERE production_order_id = ${orderId} AND stage = 'cutting'
    `;
    report(cuttingByOrder[0].n > 0, `findByOrder(${orderId},'${kind}','cutting')`, cuttingByOrder[0].n);

    // Before 0025 this read was FAIL-BY-DESIGN — an order-scoped batch carries no line. Now every
    // cutting batch carries one, so (a) the order's lines must account for every cutting batch on
    // the order (no batch falls outside all of them), and (b) this line's own cutting batches are
    // simply reported: another line of the order may legitimately own all of them.
    const cuttingOwned = await sql`
      SELECT COUNT(*)::int AS n
      FROM production_batches b
      WHERE b.production_order_id = ${orderId} AND b.stage = 'cutting'
        AND COALESCE(b.production_order_line_id, b.woven_production_line_id) IN (
          SELECT id FROM ${sql(lineTable)} WHERE production_order_id = ${orderId}
        )
    `;
    report(
      cuttingOwned[0].n === cuttingByOrder[0].n,
      `every cutting batch belongs to one of the order's lines`,
      `${cuttingOwned[0].n}/${cuttingByOrder[0].n}`
    );

    const cuttingByLine = await sql`
      SELECT COUNT(*)::int AS n FROM production_batches
      WHERE ${sql(column)} = ${lineId} AND stage = 'cutting'
    `;
    console.log(
      `findByLine(${lineTable} ${lineId},'cutting') = ${cuttingByLine[0].n}` +
        `  (reported, not asserted: another line may own the cutting)`
    );

    /* --- 5. the flow figures for that label type: a plain sum over ITS OWN batches --- */
    const ownFigures = await sql`
      SELECT
        COALESCE(SUM(b.produced_rolls) FILTER (WHERE b.stage = 'cutting'), 0)   AS cut_produced,
        COALESCE(SUM(b.produced_rolls) FILTER (WHERE b.stage = 'packaging'), 0) AS packaged_produced
      FROM production_batches b
      WHERE b.production_order_id = ${orderId}
        AND b.status <> 'CANCELLED'
        AND COALESCE(b.production_order_line_id, b.woven_production_line_id) = ${lineId}
    `;
    console.log("\n--- figures for that label type (sum over its own batches) ---");
    console.log(
      `cutProduced      = ${ownFigures[0].cut_produced}\n` +
        `packagedProduced = ${ownFigures[0].packaged_produced}`
    );
  }
} finally {
  await sql.end();
}

console.log(`\n${failures === 0 ? "All checks PASS" : `${failures} check(s) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);


