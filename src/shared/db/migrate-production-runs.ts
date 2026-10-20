import { db } from "./index";
import { productionRuns, productionOrderLines, productionOrders, workOrders } from "./schema";
import { eq, like } from "drizzle-orm";

/**
 * One-time migration: seed the append-only `production_runs` ledger from legacy production.
 *
 * Each `production_order_lines` row that has finished output (`packagedQty > 0`) becomes one
 * `production_runs` row with `run_reason = 'initial'`, keyed on the sale order
 * (`work_orders.id`) and carrying the line's printing machine/operator as the run's resources.
 *
 * Idempotent: every migrated run gets `idempotency_key = 'migrate-line-<lineId>'`, so
 * re-running skips lines already migrated and never double-counts.
 */
export async function migrateProductionRuns() {
  const lines = await db
    .select({
      lineId: productionOrderLines.id,
      labelType: productionOrderLines.labelType,
      packagedQty: productionOrderLines.packagedQty,
      printingMachineId: productionOrderLines.printingMachineId,
      printingOperatorId: productionOrderLines.printingOperatorId,
      packagingCompletedAt: productionOrderLines.packagingCompletedAt,
      updatedAt: productionOrderLines.updatedAt,
      saleOrderId: productionOrders.workOrderId,
    })
    .from(productionOrderLines)
    .innerJoin(productionOrders, eq(productionOrderLines.productionOrderId, productionOrders.id))
    .innerJoin(workOrders, eq(productionOrders.workOrderId, workOrders.id));

  const existing = await db
    .select({ key: productionRuns.idempotencyKey })
    .from(productionRuns)
    .where(like(productionRuns.idempotencyKey, "migrate-line-%"));
  const alreadyMigrated = new Set(existing.map((e) => e.key));

  let created = 0;
  let skipped = 0;
  for (const line of lines) {
    const key = `migrate-line-${line.lineId}`;
    const qty = Number(line.packagedQty);
    if (alreadyMigrated.has(key) || !(qty > 0)) {
      skipped++;
      continue;
    }
    await db.insert(productionRuns).values({
      saleOrderId: line.saleOrderId,
      productId: line.labelType,
      machineId: line.printingMachineId,
      operatorId: line.printingOperatorId,
      quantityProduced: String(qty),
      runReason: "initial",
      notes: "Migrated from legacy production line",
      producedAt: line.packagingCompletedAt ?? line.updatedAt ?? new Date(),
      idempotencyKey: key,
    });
    created++;
  }

  console.log(`Production runs migration complete — created ${created}, skipped ${skipped}.`);
  return { created, skipped };
}

// Run directly when executed via CLI.
if (process.argv[1]?.includes("migrate-production-runs")) {
  migrateProductionRuns()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Production runs migration failed:", err);
      process.exit(1);
    });
}
