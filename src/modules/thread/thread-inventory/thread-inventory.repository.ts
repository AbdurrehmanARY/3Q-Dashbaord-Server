import { db, type Tx } from "@db/index";
import {
  threadStocks,
  threadStockMovements,
  threadPurchases,
  threadDyeBatches,
} from "@db/schema";
import { eq, desc, and, sql, isNull, inArray } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "@shared/errors/ApiError";
import type { ThreadStock, NewThreadPurchase, NewThreadDyeBatch } from "@db/schema";

export type Denier = "45" | "75" | "100" | "150";
export type StockType = "primary" | "secondary";
export type MovementType =
  | "purchase_receipt"
  | "dye_consume"
  | "dye_produce"
  | "production_issue"
  | "production_release"
  | "adjustment";

/** What one thread colour actually drew, and from where — returned so planning can record it. */
export interface ConsumptionSlice {
  threadStockId: number;
  stockType: StockType;
  colorName: string;
  colorCode: string | null;
  weightKg: number;
}

/**
 * Thread stock. Every balance change goes through `moveStockTx`, which locks the ledger row
 * `FOR UPDATE`, writes the signed movement row, and asserts the balance never goes negative
 * — the same pattern the printed side's `drawStockTx` uses, for the same reason: two
 * planners reserving the same thread must serialise rather than both passing the check.
 */
export class ThreadInventoryRepository {
  /* ============================ Reads ============================ */

  async findStocks(filters?: { stockType?: StockType; denier?: Denier; colorName?: string }) {
    const conditions = [];
    if (filters?.stockType) conditions.push(eq(threadStocks.stockType, filters.stockType));
    if (filters?.denier) conditions.push(eq(threadStocks.denier, filters.denier));
    if (filters?.colorName) {
      conditions.push(sql`${threadStocks.colorName} ILIKE ${"%" + filters.colorName + "%"}`);
    }
    return db
      .select()
      .from(threadStocks)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(threadStocks.stockType, threadStocks.denier, threadStocks.colorName);
  }

  async findStockById(id: number) {
    const [row] = await db.select().from(threadStocks).where(eq(threadStocks.id, id));
    return row;
  }

  async countStocks(filters?: { stockType?: StockType; denier?: Denier; colorName?: string }) {
    const conditions = [];
    if (filters?.stockType) conditions.push(eq(threadStocks.stockType, filters.stockType));
    if (filters?.denier) conditions.push(eq(threadStocks.denier, filters.denier));
    if (filters?.colorName) {
      conditions.push(sql`${threadStocks.colorName} ILIKE ${"%" + filters.colorName + "%"}`);
    }
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(threadStocks)
      .where(conditions.length ? and(...conditions) : undefined);
    return Number(row?.count ?? 0);
  }

  /** Creates a thread ledger with its opening balance recorded as the first movement. */
  async createStockWithHistory(
    identity: { stockType: StockType; denier: Denier; colorName: string; colorCode: string | null },
    openingKg: number,
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      const stock = await this.getOrCreateStockTx(tx, identity);
      if (openingKg > 0) {
        await this.moveStockTx(tx, stock.id, openingKg, "adjustment", {
          note: "Opening balance",
          actorUserId,
        });
      }
      const [fresh] = await tx.select().from(threadStocks).where(eq(threadStocks.id, stock.id));
      return fresh;
    });
  }

  /**
   * Edits a thread ledger. Renaming the colour is a plain attribute change; changing the
   * balance is a movement, so the difference is written as an `adjustment` and the history
   * still reconciles to the balance.
   */
  async updateStockWithHistory(
    id: number,
    patch: { colorName?: string; colorCode?: string | null; balanceKg?: number },
    note?: string,
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      const [locked] = await tx.select().from(threadStocks).where(eq(threadStocks.id, id)).for("update");
      if (!locked) throw new NotFoundError("Thread stock not found");

      const attrs: Record<string, unknown> = {};
      if (patch.colorName !== undefined) attrs.colorName = patch.colorName;
      if (patch.colorCode !== undefined) attrs.colorCode = patch.colorCode;
      if (Object.keys(attrs).length > 0) {
        await tx
          .update(threadStocks)
          .set({ ...attrs, updatedAt: new Date() })
          .where(eq(threadStocks.id, id));
      }

      if (patch.balanceKg !== undefined) {
        if (patch.balanceKg < 0) throw new BadRequestError("Balance cannot be negative");
        const delta = patch.balanceKg - Number(locked.balanceKg);
        if (Math.abs(delta) > 0.0005) {
          await this.moveStockTx(tx, id, delta, "adjustment", {
            note: note ?? "Manual stock adjustment",
            actorUserId,
          });
        }
      }

      const [fresh] = await tx.select().from(threadStocks).where(eq(threadStocks.id, id));
      return fresh;
    });
  }

  /**
   * How much of this stock was actually consumed by production or dyeing.
   *
   * Deliberately NOT `threadStocks.consumedKg`: that column totals every outflow, including
   * a downward manual adjustment (a recount). A recount is not a reason to refuse deletion —
   * only a real production draw or dye run is, because those leave records pointing here.
   */
  async findConsumedByProcessKg(id: number) {
    const [row] = await db
      .select({ total: sql<string>`coalesce(sum(${threadStockMovements.weightKg}), 0)` })
      .from(threadStockMovements)
      .where(
        and(
          eq(threadStockMovements.threadStockId, id),
          inArray(threadStockMovements.movementType, ["production_issue", "dye_consume"])
        )
      );
    return Math.abs(Number(row?.total ?? 0));
  }

  async deleteStock(id: number) {
    await db.delete(threadStocks).where(eq(threadStocks.id, id));
  }

  async findMovements(threadStockId?: number, limit = 200) {
    return db
      .select()
      .from(threadStockMovements)
      .where(threadStockId ? eq(threadStockMovements.threadStockId, threadStockId) : undefined)
      .orderBy(desc(threadStockMovements.createdAt))
      .limit(limit);
  }

  async findPurchases(filters?: { vendor?: string; denier?: Denier }) {
    const conditions = [];
    if (filters?.vendor) conditions.push(sql`${threadPurchases.vendor} ILIKE ${"%" + filters.vendor + "%"}`);
    if (filters?.denier) conditions.push(eq(threadPurchases.denier, filters.denier));
    return db
      .select()
      .from(threadPurchases)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(threadPurchases.receivedDate));
  }

  async findPurchaseById(id: number) {
    const [row] = await db.select().from(threadPurchases).where(eq(threadPurchases.id, id));
    return row;
  }

  async findDyeBatches(limit = 200) {
    return db.select().from(threadDyeBatches).orderBy(desc(threadDyeBatches.createdAt)).limit(limit);
  }

  async findLastBatchNumber() {
    const [row] = await db
      .select({ batchNumber: threadDyeBatches.batchNumber })
      .from(threadDyeBatches)
      .orderBy(desc(threadDyeBatches.id))
      .limit(1);
    return row?.batchNumber;
  }

  /* ==================== Core stock primitives ==================== */

  /**
   * Finds a ledger row by its identity, or creates it at zero. Locked `FOR UPDATE` on the
   * way out so the caller can safely compute against the balance it just read.
   */
  async getOrCreateStockTx(
    tx: Tx,
    identity: { stockType: StockType; denier: Denier; colorName: string; colorCode: string | null }
  ): Promise<ThreadStock> {
    const match = and(
      eq(threadStocks.stockType, identity.stockType),
      eq(threadStocks.denier, identity.denier),
      eq(threadStocks.colorName, identity.colorName),
      identity.colorCode === null
        ? isNull(threadStocks.colorCode)
        : eq(threadStocks.colorCode, identity.colorCode)
    );

    const [existing] = await tx.select().from(threadStocks).where(match).for("update");
    if (existing) return existing;

    const [created] = await tx
      .insert(threadStocks)
      .values({ ...identity, balanceKg: "0", receivedKg: "0", consumedKg: "0" })
      .returning();
    return created;
  }

  /**
   * Applies a signed weight change to one stock row and records the movement that explains
   * it. Negative weights debit. Throws if the result would be negative — physical stock
   * cannot go below zero, and silently allowing it would corrupt every downstream figure.
   */
  async moveStockTx(
    tx: Tx,
    stockId: number,
    weightKg: number,
    movementType: MovementType,
    ref?: { referenceType?: string; referenceId?: number; note?: string; actorUserId?: number | null }
  ) {
    const [locked] = await tx
      .select()
      .from(threadStocks)
      .where(eq(threadStocks.id, stockId))
      .for("update");
    if (!locked) throw new NotFoundError("Thread stock row not found");

    const nextBalance = Number(locked.balanceKg) + weightKg;
    if (nextBalance < -0.0005) {
      throw new BadRequestError(
        `Not enough ${locked.colorName} ${locked.denier}D thread: ${Number(locked.balanceKg).toFixed(3)} kg available, ${Math.abs(weightKg).toFixed(3)} kg required`
      );
    }

    await tx
      .update(threadStocks)
      .set({
        balanceKg: String(nextBalance),
        receivedKg:
          weightKg > 0 ? String(Number(locked.receivedKg) + weightKg) : locked.receivedKg,
        consumedKg:
          weightKg < 0 ? String(Number(locked.consumedKg) - weightKg) : locked.consumedKg,
        updatedAt: new Date(),
      })
      .where(eq(threadStocks.id, stockId));

    await tx.insert(threadStockMovements).values({
      threadStockId: stockId,
      movementType,
      weightKg: String(weightKg),
      balanceAfterKg: String(nextBalance),
      referenceType: ref?.referenceType,
      referenceId: ref?.referenceId,
      note: ref?.note,
      actorUserId: ref?.actorUserId ?? null,
    });

    return nextBalance;
  }

  /* ==================== Purchases (receiving) ==================== */

  /** Records a thread purchase and credits primary (undyed) stock, atomically. */
  async createPurchaseWithStock(
    purchase: NewThreadPurchase,
    credit: { denier: Denier; colorName: string; weightKg: number },
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(threadPurchases).values(purchase).returning();
      const stock = await this.getOrCreateStockTx(tx, {
        stockType: "primary",
        denier: credit.denier,
        colorName: credit.colorName,
        colorCode: null,
      });
      await this.moveStockTx(tx, stock.id, credit.weightKg, "purchase_receipt", {
        referenceType: "thread_purchase",
        referenceId: row.id,
        note: `Received from ${purchase.vendor} (invoice ${purchase.invoiceNumber})`,
        actorUserId,
      });
      return row;
    });
  }

  /** Reverses a purchase's credit and deletes it, atomically. */
  async deletePurchaseWithStock(
    id: number,
    debit: { denier: Denier; colorName: string; weightKg: number },
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      const stock = await this.getOrCreateStockTx(tx, {
        stockType: "primary",
        denier: debit.denier,
        colorName: debit.colorName,
        colorCode: null,
      });
      await this.moveStockTx(tx, stock.id, -debit.weightKg, "adjustment", {
        referenceType: "thread_purchase",
        referenceId: id,
        note: "Purchase record deleted",
        actorUserId,
      });
      await tx.delete(threadPurchases).where(eq(threadPurchases.id, id));
    });
  }

  /* ========================== Dyeing ========================== */

  /**
   * Converts undyed primary stock into dyed secondary stock in one transaction:
   * debit white/black, credit the colour. Input and output weights are recorded separately
   * because dyeing has genuine process loss.
   */
  async createDyeBatchTransaction(
    batch: Omit<NewThreadDyeBatch, "fromStockId" | "toStockId">,
    from: { denier: Denier; colorName: string },
    to: { denier: Denier; colorName: string; colorCode: string },
    weights: { inputKg: number; outputKg: number },
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      const fromStock = await this.getOrCreateStockTx(tx, {
        stockType: "primary",
        denier: from.denier,
        colorName: from.colorName,
        colorCode: null,
      });
      const toStock = await this.getOrCreateStockTx(tx, {
        stockType: "secondary",
        denier: to.denier,
        colorName: to.colorName,
        colorCode: to.colorCode,
      });

      const [row] = await tx
        .insert(threadDyeBatches)
        .values({ ...batch, fromStockId: fromStock.id, toStockId: toStock.id })
        .returning();

      await this.moveStockTx(tx, fromStock.id, -weights.inputKg, "dye_consume", {
        referenceType: "thread_dye_batch",
        referenceId: row.id,
        note: `Dyed into ${to.colorName} (${to.colorCode})`,
        actorUserId,
      });
      await this.moveStockTx(tx, toStock.id, weights.outputKg, "dye_produce", {
        referenceType: "thread_dye_batch",
        referenceId: row.id,
        note: `Dyed from ${from.colorName} ${from.denier}D`,
        actorUserId,
      });

      return row;
    });
  }

  /* =============== Production consumption (planning) =============== */

  /**
   * Consumes one planned thread colour, **secondary (dyed) stock first, then primary
   * (undyed)** — the rule from the planning spec. A colour can therefore be satisfied by
   * two slices, and both are returned so the caller can record exactly what was drawn.
   *
   * Primary fallback prefers White (what dyeing normally starts from) before Black.
   * Everything runs inside the caller's transaction, so a shortfall on the third colour
   * rolls back the first two.
   */
  async consumeForPlanTx(
    tx: Tx,
    want: { denier: Denier; colorName: string; colorCode: string; weightKg: number },
    ref: { referenceType: string; referenceId: number; actorUserId?: number | null }
  ): Promise<ConsumptionSlice[]> {
    const slices: ConsumptionSlice[] = [];
    let remaining = want.weightKg;
    if (!(remaining > 0)) return slices;

    // 1. Dyed stock matching colour + code + denier exactly.
    const [secondary] = await tx
      .select()
      .from(threadStocks)
      .where(
        and(
          eq(threadStocks.stockType, "secondary"),
          eq(threadStocks.denier, want.denier),
          eq(threadStocks.colorName, want.colorName),
          eq(threadStocks.colorCode, want.colorCode)
        )
      )
      .for("update");

    if (secondary) {
      const take = Math.min(Number(secondary.balanceKg), remaining);
      if (take > 0) {
        await this.moveStockTx(tx, secondary.id, -take, "production_issue", {
          ...ref,
          note: `Planned for ${want.colorName} (${want.colorCode})`,
        });
        slices.push({
          threadStockId: secondary.id,
          stockType: "secondary",
          colorName: secondary.colorName,
          colorCode: secondary.colorCode,
          weightKg: take,
        });
        remaining -= take;
      }
    }

    if (remaining <= 0.0005) return slices;

    // 2. Shortfall falls through to undyed stock of the same denier.
    const primaries = await tx
      .select()
      .from(threadStocks)
      .where(
        and(
          eq(threadStocks.stockType, "primary"),
          eq(threadStocks.denier, want.denier),
          inArray(threadStocks.colorName, ["White", "Black"])
        )
      )
      .for("update");

    const ordered = primaries.sort((a: ThreadStock, b: ThreadStock) =>
      a.colorName === b.colorName ? 0 : a.colorName === "White" ? -1 : 1
    );

    for (const primary of ordered) {
      if (remaining <= 0.0005) break;
      const take = Math.min(Number(primary.balanceKg), remaining);
      if (take <= 0) continue;
      await this.moveStockTx(tx, primary.id, -take, "production_issue", {
        ...ref,
        note: `Undyed fallback for ${want.colorName} (${want.colorCode})`,
      });
      slices.push({
        threadStockId: primary.id,
        stockType: "primary",
        colorName: primary.colorName,
        colorCode: null,
        weightKg: take,
      });
      remaining -= take;
    }

    if (remaining > 0.0005) {
      throw new BadRequestError(
        `Not enough thread for ${want.colorName} (${want.colorCode}) ${want.denier}D: short by ${remaining.toFixed(3)} kg across dyed and undyed stock`
      );
    }
    return slices;
  }

  /** Credits a line's whole draw back — used when a plan is changed or cancelled. */
  async releaseForPlanTx(
    tx: Tx,
    referenceType: string,
    referenceId: number,
    actorUserId?: number | null
  ) {
    const issued = await tx
      .select({
        threadStockId: threadStockMovements.threadStockId,
        total: sql<string>`sum(${threadStockMovements.weightKg})`,
      })
      .from(threadStockMovements)
      .where(
        and(
          eq(threadStockMovements.referenceType, referenceType),
          eq(threadStockMovements.referenceId, referenceId),
          eq(threadStockMovements.movementType, "production_issue")
        )
      )
      .groupBy(threadStockMovements.threadStockId);

    for (const row of issued) {
      // Issues are stored negative, so crediting back is the absolute value.
      const giveBack = Math.abs(Number(row.total));
      if (giveBack <= 0) continue;
      await this.moveStockTx(tx, row.threadStockId, giveBack, "production_release", {
        referenceType,
        referenceId,
        note: "Plan changed or cancelled — thread returned to stock",
        actorUserId,
      });
    }
  }
}

export const threadInventoryRepository = new ThreadInventoryRepository();
