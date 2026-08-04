/**
 * DEV/TEST reset: wipes the sales-order + production side of the database so the workflow
 * can be re-tested from a clean slate, and reconciles the inventory ledger so stock is
 * consistent afterwards.
 *
 *   CLEARS:  production_roll_issuances, production_stage_events, production_order_lines,
 *            production_orders, work_orders
 *   RESETS:  inventory_rolls  → issuedRolls = 0, balanceRolls = openingStock + receivedRolls
 *            (i.e. as if nothing had been issued to production)
 *   KEEPS:   companies, brands, materials, machines, operators, users, purchase_records
 *
 * Run with:  npm run db:reset:production   (destructive — there is no undo).
 */
import { db } from "./index";
import {
  productionRollIssuances,
  productionStageEvents,
  productionOrderLines,
  productionOrders,
  workOrders,
  inventoryRolls,
} from "./schema";
import { sql } from "drizzle-orm";

async function reset() {
  console.log("Clearing production + work-order data…");

  // Delete in dependency order (children first) so it works regardless of FK cascade config.
  await db.delete(productionRollIssuances);
  await db.delete(productionStageEvents);
  await db.delete(productionOrderLines);
  await db.delete(productionOrders);
  await db.delete(workOrders);

  // Restore inventory to its pre-production state: nothing issued, balance back to received.
  const updated = await db
    .update(inventoryRolls)
    .set({
      issuedRolls: "0",
      balanceRolls: sql`${inventoryRolls.openingStock} + ${inventoryRolls.receivedRolls}`,
      updatedAt: new Date(),
    })
    .returning({ materialCode: inventoryRolls.materialCode });

  console.log(
    `Done. Cleared work orders + production data; reset ${updated.length} inventory ledger row(s).`
  );
  process.exit(0);
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
