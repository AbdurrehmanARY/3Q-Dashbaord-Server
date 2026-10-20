import { db, type Tx } from "@db/index";
import { purchaseRecords, inventoryRolls, inventoryRollMovements } from "@db/schema";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import { BadRequestError } from "@shared/errors/ApiError";
import type { InventoryRoll } from "@db/schema";
import { inventoryRollRepository } from "./inventory-roll.repository";

type PurchaseInsert = {
  reportDate: string;
  materialCode: string;
  invoiceNumber: string;
  vendor: string;
  cartonQty: number;
  rollsPerCarton: number;
  totalRoll: string;
  rollLength: string;
  netWeight: string;
  efs?: string;
  totalRollPer200m?: string;
  invoiceWeight?: string;
  localWeight?: string;
  gdNumber?: string;
  materialType?: string;
  itemName?: string;
};

/** A signed stock movement applied to a material's inventory ledger. */
export interface StockAdjustment {
  materialCode: string;
  /** Rolls to add (positive) or remove (negative) from received + balance. */
  rolls: number;
}

export class InventoryRepository {
  /**
   * Credits/debits a material's received + balance, creating the ledger row if absent.
   *
   * Locks the ledger row `FOR UPDATE` before writing so concurrent reconciliations
   * serialise, and asserts the resulting balance is not negative — a purchase can't be
   * edited down or deleted below what production has already consumed. (This mirrors the
   * guard `drawStockTx` has always had on the issuance side; the purchase side was missing
   * it, which let stock silently go negative.)
   */
  private async applyStockDeltaTx(
    tx: Tx,
    materialCode: string,
    deltaRolls: number,
    ref?: { purchaseId?: number; note?: string }
  ) {
    if (deltaRolls === 0) return;
    const [existing] = await tx
      .select()
      .from(inventoryRolls)
      .where(eq(inventoryRolls.materialCode, materialCode))
      .for("update");

    let rollId: number;
    let balanceAfter: number;

    if (existing) {
      const [updated] = await tx
        .update(inventoryRolls)
        .set({
          receivedRolls: sql`${inventoryRolls.receivedRolls} + ${deltaRolls}`,
          balanceRolls: sql`${inventoryRolls.balanceRolls} + ${deltaRolls}`,
          updatedAt: new Date(),
        })
        .where(eq(inventoryRolls.materialCode, materialCode))
        .returning();

      if (!updated || Number(updated.balanceRolls) < 0) {
        throw new BadRequestError(
          `Cannot reduce ${materialCode} stock by ${-deltaRolls} rolls: it would drive the balance negative — rolls have already been issued to production`
        );
      }
      rollId = updated.id;
      balanceAfter = Number(updated.balanceRolls);
    } else {
      if (deltaRolls < 0) {
        throw new BadRequestError(`No inventory ledger exists for ${materialCode} to reduce`);
      }
      const [created] = await tx
        .insert(inventoryRolls)
        .values({
          materialCode,
          openingStock: "0",
          receivedRolls: String(deltaRolls),
          issuedRolls: "0",
          balanceRolls: String(deltaRolls),
        })
        .returning();
      rollId = created.id;
      balanceAfter = Number(created.balanceRolls);
    }

    // The movement row is what makes the purchase visible in stock history; without it the
    // balance moved with nothing on record explaining why.
    await tx.insert(inventoryRollMovements).values({
      inventoryRollId: rollId,
      materialCode,
      movementType: deltaRolls > 0 ? "purchase_receipt" : "purchase_reversal",
      rolls: String(deltaRolls),
      balanceAfter: String(balanceAfter),
      referenceType: "purchase_record",
      referenceId: ref?.purchaseId,
      note: ref?.note ?? (deltaRolls > 0 ? "Purchase received" : "Purchase reversed"),
    });
  }

  /** Inserts a purchase and credits its rolls into inventory, atomically. */
  async createPurchaseWithStock(data: PurchaseInsert, adjustment: StockAdjustment) {
    return db.transaction(async (tx) => {
      const [report] = await tx.insert(purchaseRecords).values(data).returning();
      await this.applyStockDeltaTx(tx, adjustment.materialCode, adjustment.rolls, {
        purchaseId: report.id,
        note: `Purchase ${report.invoiceNumber ?? report.id} received`,
      });
      return report;
    });
  }

  /** Updates a purchase and reconciles inventory by the given stock deltas, atomically. */
  async updatePurchaseWithStock(id: number | string, data: Record<string, unknown>, adjustments: StockAdjustment[]) {
    return db.transaction(async (tx) => {
      const [report] = await tx
        .update(purchaseRecords)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(purchaseRecords.id, Number(id)))
        .returning();
      for (const adj of adjustments) {
        await this.applyStockDeltaTx(tx, adj.materialCode, adj.rolls, {
          purchaseId: Number(id),
          note: `Purchase #${id} edited`,
        });
      }
      return report;
    });
  }

  /** Deletes a purchase and reverses its rolls out of inventory, atomically. */
  async deletePurchaseWithStock(id: number | string, adjustment: StockAdjustment) {
    return db.transaction(async (tx) => {
      await this.applyStockDeltaTx(tx, adjustment.materialCode, adjustment.rolls, {
        purchaseId: Number(id),
        note: `Purchase #${id} deleted`,
      });
      await tx.delete(purchaseRecords).where(eq(purchaseRecords.id, Number(id)));
    });
  }

  async findPurchaseById(id: number | string) {
    const [report] = await db.select().from(purchaseRecords).where(eq(purchaseRecords.id, Number(id)));
    return report;
  }

  async findAllPurchases(filters?: { startDate?: string; endDate?: string; vendor?: string; materialCode?: string }) {
    const conditions = [];
    if (filters?.vendor) conditions.push(eq(purchaseRecords.vendor, filters.vendor));
    if (filters?.materialCode) conditions.push(eq(purchaseRecords.materialCode, filters.materialCode));
    if (filters?.startDate && filters?.endDate) {
      conditions.push(sql`${purchaseRecords.reportDate} BETWEEN ${filters.startDate} AND ${filters.endDate}`);
    }
    return db.select().from(purchaseRecords).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(purchaseRecords.reportDate));
  }

  async findInventoryRolls(filters?: { materialCode?: string; type?: string }) {
    await inventoryRollRepository.syncMaterialStockLedgers();
    const conditions = [];
    if (filters?.materialCode) conditions.push(eq(inventoryRolls.materialCode, filters.materialCode));
    return db.select().from(inventoryRolls).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(asc(inventoryRolls.materialCode));
  }

  async findInventoryRollByMaterialCode(materialCode: string) {
    let [roll] = await db.select().from(inventoryRolls).where(eq(inventoryRolls.materialCode, materialCode));
    if (!roll) {
      await inventoryRollRepository.syncMaterialStockLedgers();
      [roll] = await db.select().from(inventoryRolls).where(eq(inventoryRolls.materialCode, materialCode));
    }
    return roll;
  }

  async updateInventoryRoll(materialCode: string, data: Record<string, unknown>): Promise<InventoryRoll> {
    const [roll] = await db.update(inventoryRolls).set(data).where(eq(inventoryRolls.materialCode, materialCode)).returning();
    return roll;
  }

  async createInventoryRoll(data: { materialCode: string; openingStock: string; receivedRolls: string; issuedRolls: string; balanceRolls: string }) {
    const [roll] = await db.insert(inventoryRolls).values(data).returning();
    return roll;
  }
}

export const inventoryRepository = new InventoryRepository();
