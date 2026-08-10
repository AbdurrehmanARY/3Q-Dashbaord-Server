import { db } from "@db/index";
import { inkPurchases, inkConsumptions, operators } from "@db/schema";
import { desc, eq, sql } from "drizzle-orm";
import type { NewInkPurchase, NewInkConsumption } from "@db/schema";

/**
 * Ink data access. Stock is **derived**, never stored: per material code it is the sum of
 * purchase `total_weight` minus the sum of consumption `weight` (and the same for quantity).
 */
export class InkRepository {
  /* ---------------- Purchases ---------------- */
  listPurchases() {
    return db.select().from(inkPurchases).orderBy(desc(inkPurchases.reportDate), desc(inkPurchases.id));
  }
  async findPurchaseById(id: number) {
    const [row] = await db.select().from(inkPurchases).where(eq(inkPurchases.id, id));
    return row;
  }
  async createPurchase(data: NewInkPurchase) {
    const [row] = await db.insert(inkPurchases).values(data).returning();
    return row;
  }
  async updatePurchase(id: number, data: Partial<NewInkPurchase>) {
    const [row] = await db.update(inkPurchases).set(data).where(eq(inkPurchases.id, id)).returning();
    return row;
  }
  async removePurchase(id: number) {
    const [row] = await db.delete(inkPurchases).where(eq(inkPurchases.id, id)).returning();
    return row;
  }

  /* ---------------- Consumptions ---------------- */
  listConsumptions() {
    return db
      .select({
        id: inkConsumptions.id,
        materialCode: inkConsumptions.materialCode,
        qtyAssigned: inkConsumptions.qtyAssigned,
        operatorId: inkConsumptions.operatorId,
        operatorName: inkConsumptions.operatorName,
        weight: inkConsumptions.weight,
        note: inkConsumptions.note,
        consumedAt: inkConsumptions.consumedAt,
      })
      .from(inkConsumptions)
      .orderBy(desc(inkConsumptions.consumedAt), desc(inkConsumptions.id));
  }
  async createConsumption(data: NewInkConsumption) {
    const [row] = await db.insert(inkConsumptions).values(data).returning();
    return row;
  }
  async removeConsumption(id: number) {
    const [row] = await db.delete(inkConsumptions).where(eq(inkConsumptions.id, id)).returning();
    return row;
  }

  /* ---------------- Derived stock ---------------- */
  /**
   * Live stock per material code. LEFT JOIN so a code that has only purchases (or, in
   * theory, only consumptions) still surfaces; COALESCE keeps the arithmetic null-safe.
   */
  async stockLevels() {
    const purchased = db
      .select({
        materialCode: inkPurchases.materialCode,
        purchasedQty: sql<string>`COALESCE(SUM(${inkPurchases.quantity}), 0)`.as("purchased_qty"),
        purchasedWeight: sql<string>`COALESCE(SUM(${inkPurchases.totalWeight}), 0)`.as("purchased_weight"),
      })
      .from(inkPurchases)
      .groupBy(inkPurchases.materialCode)
      .as("purchased");

    const consumed = db
      .select({
        materialCode: inkConsumptions.materialCode,
        consumedQty: sql<string>`COALESCE(SUM(${inkConsumptions.qtyAssigned}), 0)`.as("consumed_qty"),
        consumedWeight: sql<string>`COALESCE(SUM(${inkConsumptions.weight}), 0)`.as("consumed_weight"),
      })
      .from(inkConsumptions)
      .groupBy(inkConsumptions.materialCode)
      .as("consumed");

    return db
      .select({
        materialCode: purchased.materialCode,
        purchasedQty: purchased.purchasedQty,
        purchasedWeight: purchased.purchasedWeight,
        consumedQty: sql<string>`COALESCE(${consumed.consumedQty}, 0)`,
        consumedWeight: sql<string>`COALESCE(${consumed.consumedWeight}, 0)`,
      })
      .from(purchased)
      .leftJoin(consumed, eq(purchased.materialCode, consumed.materialCode))
      .orderBy(purchased.materialCode);
  }

  /** Current balance weight for one material code (purchased − consumed). */
  async balanceWeight(materialCode: string): Promise<number> {
    const [row] = await db
      .select({
        purchased: sql<string>`COALESCE((SELECT SUM(${inkPurchases.totalWeight}) FROM ${inkPurchases} WHERE ${inkPurchases.materialCode} = ${materialCode}), 0)`,
        consumed: sql<string>`COALESCE((SELECT SUM(${inkConsumptions.weight}) FROM ${inkConsumptions} WHERE ${inkConsumptions.materialCode} = ${materialCode}), 0)`,
      })
      .from(sql`(SELECT 1) AS one`);
    return Number(row?.purchased ?? 0) - Number(row?.consumed ?? 0);
  }

  /** Consumption totals grouped by operator, for the operator-breakdown view. */
  async consumptionByOperator() {
    return db
      .select({
        operatorId: inkConsumptions.operatorId,
        operatorName: sql<string>`COALESCE(${inkConsumptions.operatorName}, ${operators.name}, 'Unassigned')`,
        entries: sql<string>`COUNT(*)`,
        totalQty: sql<string>`COALESCE(SUM(${inkConsumptions.qtyAssigned}), 0)`,
        totalWeight: sql<string>`COALESCE(SUM(${inkConsumptions.weight}), 0)`,
      })
      .from(inkConsumptions)
      .leftJoin(operators, eq(inkConsumptions.operatorId, operators.id))
      .groupBy(inkConsumptions.operatorId, inkConsumptions.operatorName, operators.name)
      .orderBy(sql`SUM(${inkConsumptions.weight}) DESC`);
  }
}

export const inkRepository = new InkRepository();
