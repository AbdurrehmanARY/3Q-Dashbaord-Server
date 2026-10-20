// Verification: confirm estimated_weaving_hours exists on woven_work_order_details
// and that the 0024 backfill produced sensible values.
// Run: node --env-file server/.env server/scripts/verify-estimated-weaving.mjs
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { default: postgres } = await import(
  pathToFileURL(path.join(serverDir, "node_modules", "postgres", "src", "index.js")).href
);
const sql = postgres(process.env.DIRECT_URL, { max: 1 });

const [cols] = await sql`
  select column_name, data_type, numeric_precision, numeric_scale, column_default
  from information_schema.columns
  where table_name = 'woven_work_order_details' and column_name = 'estimated_weaving_hours'`;
console.log("column:", cols ?? "MISSING!");

const [counts] = await sql`
  select count(*)::int as total,
         count(*) filter (where estimated_weaving_hours > 0)::int as positive,
         count(*) filter (where estimated_weaving_hours = 0)::int as zero
  from woven_work_order_details`;
console.log("rows:", counts);

const sample = await sql`
  select d.design_code, w.total_qty, d.repeat, d.pick, d.speed, d.estimated_weaving_hours
  from woven_work_order_details d
  join work_orders w on w.id = d.work_order_id
  order by d.estimated_weaving_hours desc
  limit 5`;
console.log("top rows by estimate:");
for (const r of sample) console.log(" ", r);

// Cross-check: recompute one row with the JS formula and compare (2dp tolerance).
if (sample.length > 0) {
  const r = sample[0];
  const speedVal = Number(r.speed) > 0 ? Number(r.speed) : 600;
  const expect =
    Math.round(((Number(r.total_qty) / Number(r.repeat)) * Number(r.pick) / (speedVal * 60)) * 100) / 100;
  const actual = Number(r.estimated_weaving_hours);
  console.log(expect === actual ? `formula cross-check OK (${expect})` : `MISMATCH expect=${expect} actual=${actual}`);
}

await sql.end();
