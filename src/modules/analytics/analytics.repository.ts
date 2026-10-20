import { db } from "@db/index";
import { workOrders, productionOrderLines, materials, inventoryRolls, purchaseRecords } from "@db/schema";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import type { WorkOrder, ProductionOrderLine, Material, InventoryRoll, PurchaseRecord } from "@db/schema";

export class AnalyticsRepository {
  async countWorkOrders() {
    const [row] = await db.select({ value: sql<number>`count(*)` }).from(workOrders);
    return Number(row?.value ?? 0);
  }

  /** Work orders still in production (not yet completed/dispatched). */
  async countSubmittedWorkOrders() {
    const [row] = await db.select({ value: sql<number>`count(*)` }).from(workOrders).where(eq(workOrders.status, "initiate_production"));
    return Number(row?.value ?? 0);
  }

  /* Production counts are per label-type line on a production order. A line is complete
     when every planned roll has been packaged. */
  async countProductionProgress() {
    const [row] = await db.select({ value: sql<number>`count(*)` }).from(productionOrderLines);
    return Number(row?.value ?? 0);
  }

  async countActiveProductionProgress() {
    const [row] = await db
      .select({ value: sql<number>`count(*)` })
      .from(productionOrderLines)
      .where(sql`cast(${productionOrderLines.packagedRolls} as numeric) < cast(${productionOrderLines.totalRolls} as numeric)`);
    return Number(row?.value ?? 0);
  }

  async countCompletedProductionProgress() {
    const [row] = await db
      .select({ value: sql<number>`count(*)` })
      .from(productionOrderLines)
      .where(
        sql`cast(${productionOrderLines.packagedRolls} as numeric) >= cast(${productionOrderLines.totalRolls} as numeric) AND cast(${productionOrderLines.totalRolls} as numeric) > 0`
      );
    return Number(row?.value ?? 0);
  }

  async countMaterials() {
    const [row] = await db.select({ value: sql<number>`count(*)` }).from(materials);
    return Number(row?.value ?? 0);
  }

  async countLowStock() {
    const [row] = await db.select({ value: sql<number>`count(*)` }).from(inventoryRolls).where(sql`cast(${inventoryRolls.balanceRolls} as numeric) < 5`);
    return Number(row?.value ?? 0);
  }

  async sumBalanceRolls() {
    const [row] = await db.select({ value: sql<number>`coalesce(sum(cast(${inventoryRolls.balanceRolls} as numeric)), 0)` }).from(inventoryRolls);
    return Number(row?.value ?? 0);
  }

  async sumIssuedRolls() {
    const [row] = await db.select({ value: sql<number>`coalesce(sum(cast(${inventoryRolls.issuedRolls} as numeric)), 0)` }).from(inventoryRolls);
    return Number(row?.value ?? 0);
  }

}

export const analyticsRepository = new AnalyticsRepository();
