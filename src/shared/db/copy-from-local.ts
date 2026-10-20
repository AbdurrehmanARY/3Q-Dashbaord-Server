import "dotenv/config";
import postgres from "postgres";

/**
 * One-time data migration: copy every public table from the local Postgres
 * (LOCAL_DATABASE_URL) into the remote database (DIRECT_URL / DATABASE_URL).
 *
 * - Copies only tables that exist in BOTH databases.
 * - Inserts parents before children (topological sort of the FK graph), so foreign keys
 *   never fail; `on conflict do nothing` makes it safe to re-run.
 * - Resets every serial/identity sequence afterwards so future inserts don't collide.
 *
 * Run: npm run db:copy:from-local
 */

const SRC = process.env.LOCAL_DATABASE_URL;
const DEST = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!SRC || !DEST) {
  console.error("Set LOCAL_DATABASE_URL (source) and DIRECT_URL or DATABASE_URL (destination).");
  process.exit(1);
}

const src = postgres(SRC, { prepare: false });
const dest = postgres(DEST, { prepare: false });

const IGNORE = (t: string) => t === "__drizzle_migrations" || t.startsWith("drizzle_");

async function publicTables(sql: postgres.Sql): Promise<string[]> {
  const rows = await sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'`;
  return rows.map((r) => r.table_name).filter((t) => !IGNORE(t));
}

/** Parent (referenced) → set of child tables, from the source FK metadata. */
async function fkEdges(sql: postgres.Sql): Promise<Array<{ child: string; parent: string }>> {
  return sql<{ child: string; parent: string }[]>`
    select tc.table_name as child, ccu.table_name as parent
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'`;
}

function topoSort(tables: string[], edges: Array<{ child: string; parent: string }>): string[] {
  const set = new Set(tables);
  const parents = new Map<string, Set<string>>(tables.map((t) => [t, new Set()]));
  for (const { child, parent } of edges) {
    if (set.has(child) && set.has(parent) && child !== parent) parents.get(child)!.add(parent);
  }
  const order: string[] = [];
  const done = new Set<string>();
  const onStack = new Set<string>();
  const visit = (t: string) => {
    if (done.has(t) || onStack.has(t)) return; // cycle → best-effort, skip re-entry
    onStack.add(t);
    for (const p of parents.get(t)!) visit(p);
    onStack.delete(t);
    done.add(t);
    order.push(t);
  };
  for (const t of tables) visit(t);
  return order;
}

async function main() {
  const [srcTables, destTables, edges] = await Promise.all([
    publicTables(src),
    publicTables(dest),
    fkEdges(src),
  ]);
  const destSet = new Set(destTables);
  const tables = topoSort(srcTables, edges).filter((t) => destSet.has(t));

  // Columns present in the destination, per table — so schema drift (a column that exists
  // in local but not remote, or vice-versa) narrows the copy to the shared set instead of
  // erroring. Missing remote columns simply take their default on the copied rows.
  const destColRows = await dest<{ table_name: string; column_name: string }[]>`
    select table_name, column_name from information_schema.columns where table_schema = 'public'`;
  const destCols = new Map<string, Set<string>>();
  for (const { table_name, column_name } of destColRows) {
    (destCols.get(table_name) ?? destCols.set(table_name, new Set()).get(table_name)!).add(column_name);
  }

  console.log(`Copying ${tables.length} tables (parents first)…\n`);

  const CHUNK = 500;
  for (const table of tables) {
    const rows = await src<Record<string, unknown>[]>`select * from ${src(table)}`;
    if (rows.length === 0) {
      console.log(`·  ${table}: empty`);
      continue;
    }
    const cols = destCols.get(table) ?? new Set();
    // Project each source row onto only the columns the destination actually has.
    const projected = rows.map((r) => {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(r)) if (cols.has(k)) o[k] = r[k];
      return o;
    });
    const dropped = Object.keys(rows[0]).filter((k) => !cols.has(k));
    for (let i = 0; i < projected.length; i += CHUNK) {
      const chunk = projected.slice(i, i + CHUNK);
      await dest`insert into ${dest(table)} ${dest(chunk)} on conflict do nothing`;
    }
    console.log(`✓  ${table}: ${rows.length} rows${dropped.length ? `  (skipped cols: ${dropped.join(", ")})` : ""}`);
  }

  // Reset serial/identity sequences to max(id) so subsequent inserts don't collide.
  const seqCols = await dest<{ table_name: string; column_name: string }[]>`
    select table_name, column_name from information_schema.columns
    where table_schema = 'public' and column_default like 'nextval%'`;
  for (const { table_name, column_name } of seqCols) {
    if (IGNORE(table_name)) continue;
    await dest.unsafe(
      `select setval(pg_get_serial_sequence('"${table_name}"', '${column_name}'),
        coalesce((select max("${column_name}") from "${table_name}"), 1), true)`
    );
  }
  console.log("\nSequences reset. Done.");
}

main()
  .then(() => Promise.all([src.end(), dest.end()]))
  .catch(async (e) => {
    console.error("\nCOPY FAILED:", e?.message ?? e);
    await Promise.allSettled([src.end(), dest.end()]);
    process.exit(1);
  });
