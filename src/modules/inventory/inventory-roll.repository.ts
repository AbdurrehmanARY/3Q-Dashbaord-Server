import { db, type Tx } from "@db/index";
import { inventoryRolls, inventoryRollMovements, materials, purchaseRecords, stickerMaterials } from "@db/schema";
import { eq, asc, desc, and, sql } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "@shared/errors/ApiError";
import type { InventoryRoll } from "@db/schema";

export type RollMovementType =
  | "opening_balance"
  | "purchase_receipt"
  | "purchase_reversal"
  | "production_issue"
  | "production_release"
  | "adjustment";

export interface RollListFilters {
  materialCode?: string;
  /** Free-text across material code and description. */
  search?: string;
  type?: string;
  /** `low` = below the threshold but in stock; `out` = zero or less. */
  stockStatus?: "in" | "low" | "out";
  sortBy?: "materialCode" | "balanceRolls" | "receivedRolls" | "issuedRolls" | "updatedAt";
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** Below this many rolls a ledger reads as "low stock" — matches the client's badge. */
export const LOW_STOCK_ROLLS = 5;

/**
 * The roll stock ledger.
 *
 * Every balance change goes through `moveTx`, which locks the ledger row `FOR UPDATE`,
 * writes the signed movement row that explains it, and refuses to let the balance go
 * negative — the same contract `drawStockTx` and the thread ledger already follow, so all
 * three inventories behave identically under concurrency.
 */
export class InventoryRollRepository {
  /** Joined with the material so the list can search and filter on description/type. */
  private baseSelect = {
    id: inventoryRolls.id,
    materialCode: inventoryRolls.materialCode,
    openingStock: inventoryRolls.openingStock,
    receivedRolls: inventoryRolls.receivedRolls,
    issuedRolls: inventoryRolls.issuedRolls,
    balanceRolls: inventoryRolls.balanceRolls,
    rollPerKg: inventoryRolls.rollPerKg,
    createdAt: inventoryRolls.createdAt,
    updatedAt: inventoryRolls.updatedAt,
    materialDescription: materials.description,
    materialType: materials.type,
    weightPerRoll: materials.weightPerRoll,
  };

  /**
   * Reconciles every material's ledger with what purchasing has actually received, so a
   * material's stock always equals what was bought into it:
   *
   *   receivedRolls = Σ purchase_records + Σ sticker_materials, for that material code
   *   balanceRolls  = openingStock + receivedRolls − issuedRolls   (never below zero)
   *
   * A material with no ledger yet gets one; `openingStock` and `issuedRolls` are never
   * touched, so manual opening balances and production draws both survive a sync.
   *
   * This is ONE set-based statement on purpose. It used to be a loop that issued an
   * INSERT or UPDATE per material — with 141 materials that was 141 sequential round
   * trips, and because `getInventoryRolls` runs `findAll` and `countAll` concurrently it
   * came to 282 per request. Against a pooled remote Postgres that took long enough for
   * the stock page to look like it never loaded. Keep this as a single statement.
   */
  async syncMaterialStockLedgers() {
    await db.execute(sql`
      INSERT INTO ${inventoryRolls} (
        material_code, opening_stock, received_rolls, issued_rolls, balance_rolls, roll_per_kg, updated_at
      )
      SELECT
        m.code,
        0,
        received.rolls,
        0,
        received.rolls,
        CASE WHEN COALESCE(m.weight_per_roll, 0) > 0
             THEN ROUND(1 / m.weight_per_roll, 4)
             ELSE 0 END,
        NOW()
      FROM ${materials} m
      CROSS JOIN LATERAL (
        SELECT
          COALESCE((
            -- Older rows predate the derived column, so fall back to the formula behind it.
            SELECT SUM(COALESCE(p.total_roll, p.carton_qty * p.rolls_per_carton))
            FROM ${purchaseRecords} p WHERE p.material_code = m.code
          ), 0)
          + COALESCE((
            SELECT SUM(s.roll_quantity) FROM ${stickerMaterials} s WHERE s.material_code = m.code
          ), 0) AS rolls
      ) received
      ON CONFLICT (material_code) DO UPDATE SET
        received_rolls = EXCLUDED.received_rolls,
        balance_rolls = GREATEST(
          0,
          ${inventoryRolls}.opening_stock + EXCLUDED.received_rolls - GREATEST(${inventoryRolls}.issued_rolls, 0)
        ),
        -- Only seed roll-per-kg; once a user has set it, their value wins.
        roll_per_kg = CASE WHEN ${inventoryRolls}.roll_per_kg = 0
                           THEN EXCLUDED.roll_per_kg
                           ELSE ${inventoryRolls}.roll_per_kg END,
        updated_at = NOW()
      WHERE
        ${inventoryRolls}.received_rolls IS DISTINCT FROM EXCLUDED.received_rolls
        OR ${inventoryRolls}.balance_rolls IS DISTINCT FROM GREATEST(
          0,
          ${inventoryRolls}.opening_stock + EXCLUDED.received_rolls - GREATEST(${inventoryRolls}.issued_rolls, 0)
        )
        OR (${inventoryRolls}.roll_per_kg = 0 AND EXCLUDED.roll_per_kg <> 0)
    `);
  }

  /**
   * Pure read. Call `syncMaterialStockLedgers()` first if the caller needs the ledgers
   * reconciled with purchasing — the service does exactly that, once per request, so the
   * count below can't race the sync's inserts.
   */
  async findAll(filters?: RollListFilters) {
    const conditions = [];
    if (filters?.materialCode) conditions.push(eq(inventoryRolls.materialCode, filters.materialCode));
    if (filters?.search) {
      const q = `%${filters.search}%`;
      conditions.push(
        sql`(${inventoryRolls.materialCode} ILIKE ${q} OR ${materials.description} ILIKE ${q})`
      );
    }
    if (filters?.type) conditions.push(eq(materials.type, filters.type));
    if (filters?.stockStatus === "out") conditions.push(sql`${inventoryRolls.balanceRolls} <= 0`);
    if (filters?.stockStatus === "low") {
      conditions.push(
        sql`${inventoryRolls.balanceRolls} > 0 AND ${inventoryRolls.balanceRolls} < ${LOW_STOCK_ROLLS}`
      );
    }
    if (filters?.stockStatus === "in") {
      conditions.push(sql`${inventoryRolls.balanceRolls} >= ${LOW_STOCK_ROLLS}`);
    }

    const column = {
      materialCode: inventoryRolls.materialCode,
      balanceRolls: inventoryRolls.balanceRolls,
      receivedRolls: inventoryRolls.receivedRolls,
      issuedRolls: inventoryRolls.issuedRolls,
      updatedAt: inventoryRolls.updatedAt,
    }[filters?.sortBy ?? "materialCode"];

    return db
      .select(this.baseSelect)
      .from(inventoryRolls)
      .leftJoin(materials, eq(inventoryRolls.materialCode, materials.code))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(filters?.sortDir === "desc" ? desc(column) : asc(column))
      .limit(filters?.limit ?? 500)
      .offset(filters?.offset ?? 0);
  }

  /**
   * Total matching rows, for pagination. Mirrors `findAll`'s filters.
   *
   * Deliberately does NOT sync: the service runs this alongside `findAll`, which already
   * reconciled the ledgers. Syncing here too would double the write work per request and
   * have two statements racing to write the same rows.
   */
  async countAll(filters?: RollListFilters) {
    const conditions = [];
    if (filters?.materialCode) conditions.push(eq(inventoryRolls.materialCode, filters.materialCode));
    if (filters?.search) {
      const q = `%${filters.search}%`;
      conditions.push(
        sql`(${inventoryRolls.materialCode} ILIKE ${q} OR ${materials.description} ILIKE ${q})`
      );
    }
    if (filters?.type) conditions.push(eq(materials.type, filters.type));
    if (filters?.stockStatus === "out") conditions.push(sql`${inventoryRolls.balanceRolls} <= 0`);
    if (filters?.stockStatus === "low") {
      conditions.push(
        sql`${inventoryRolls.balanceRolls} > 0 AND ${inventoryRolls.balanceRolls} < ${LOW_STOCK_ROLLS}`
      );
    }
    if (filters?.stockStatus === "in") {
      conditions.push(sql`${inventoryRolls.balanceRolls} >= ${LOW_STOCK_ROLLS}`);
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryRolls)
      .leftJoin(materials, eq(inventoryRolls.materialCode, materials.code))
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return Number(row?.count ?? 0);
  }

  async findByMaterialCode(materialCode: string) {
    let [roll] = await db.select().from(inventoryRolls).where(eq(inventoryRolls.materialCode, materialCode));
    if (!roll) {
      await this.syncMaterialStockLedgers();
      [roll] = await db.select().from(inventoryRolls).where(eq(inventoryRolls.materialCode, materialCode));
    }
    return roll;
  }

  async findMovements(materialCode?: string, limit = 200) {
    return db
      .select()
      .from(inventoryRollMovements)
      .where(materialCode ? eq(inventoryRollMovements.materialCode, materialCode) : undefined)
      .orderBy(desc(inventoryRollMovements.createdAt))
      .limit(limit);
  }

  /**
   * Applies a signed roll change to one ledger and records the movement explaining it.
   * Negative values debit. Throws if the result would be negative — physical stock cannot
   * go below zero, and allowing it would corrupt every figure downstream.
   */
  private async moveTx(
    tx: Tx,
    rollId: number,
    rolls: number,
    movementType: RollMovementType,
    ref?: { referenceType?: string; referenceId?: number; note?: string; actorUserId?: number | null }
  ) {
    const [locked] = await tx
      .select()
      .from(inventoryRolls)
      .where(eq(inventoryRolls.id, rollId))
      .for("update");
    if (!locked) throw new NotFoundError("Inventory roll not found");

    const next = Number(locked.balanceRolls) + rolls;
    if (next < -0.0001) {
      throw new BadRequestError(
        `Not enough ${locked.materialCode} stock: ${Number(locked.balanceRolls)} rolls available, ${Math.abs(rolls)} required`
      );
    }

    await tx
      .update(inventoryRolls)
      .set({
        balanceRolls: String(next),
        receivedRolls: rolls > 0 ? String(Number(locked.receivedRolls) + rolls) : locked.receivedRolls,
        issuedRolls: rolls < 0 ? String(Number(locked.issuedRolls) - rolls) : locked.issuedRolls,
        updatedAt: new Date(),
      })
      .where(eq(inventoryRolls.id, rollId));

    await tx.insert(inventoryRollMovements).values({
      inventoryRollId: rollId,
      materialCode: locked.materialCode,
      movementType,
      rolls: String(rolls),
      balanceAfter: String(next),
      referenceType: ref?.referenceType,
      referenceId: ref?.referenceId,
      note: ref?.note,
      actorUserId: ref?.actorUserId ?? null,
    });

    return next;
  }

  /** Creates a ledger and records its opening balance as the first movement. */
  async createWithHistory(
    data: {
      materialCode: string;
      openingStock: string;
      receivedRolls: string;
      issuedRolls: string;
      balanceRolls: string;
      rollPerKg: string;
    },
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      const [roll] = await tx.insert(inventoryRolls).values(data).returning();
      await tx.insert(inventoryRollMovements).values({
        inventoryRollId: roll.id,
        materialCode: roll.materialCode,
        movementType: "opening_balance",
        rolls: roll.balanceRolls,
        balanceAfter: roll.balanceRolls,
        note: "Ledger created",
        actorUserId: actorUserId ?? null,
      });
      return roll;
    });
  }

  /**
   * Edits a ledger. `rollPerKg` is a plain attribute, but any change to a stock figure is a
   * movement — the difference between the old and new balance is recorded as an adjustment
   * so the history still reconciles to the balance.
   */
  async updateWithHistory(
    materialCode: string,
    patch: Partial<Pick<InventoryRoll, "openingStock" | "receivedRolls" | "issuedRolls" | "rollPerKg">> & {
      balanceRolls?: string;
    },
    note?: string,
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(inventoryRolls)
        .where(eq(inventoryRolls.materialCode, materialCode))
        .for("update");
      if (!locked) throw new NotFoundError("Inventory roll not found");

      const nextBalance = patch.balanceRolls !== undefined ? Number(patch.balanceRolls) : Number(locked.balanceRolls);
      if (nextBalance < 0) {
        throw new BadRequestError("Balance rolls cannot be negative");
      }

      const [updated] = await tx
        .update(inventoryRolls)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(inventoryRolls.materialCode, materialCode))
        .returning();

      const delta = nextBalance - Number(locked.balanceRolls);
      if (Math.abs(delta) > 0.0001) {
        await tx.insert(inventoryRollMovements).values({
          inventoryRollId: locked.id,
          materialCode,
          movementType: "adjustment",
          rolls: String(delta),
          balanceAfter: String(nextBalance),
          note: note ?? "Manual stock adjustment",
          actorUserId: actorUserId ?? null,
        });
      }
      return updated;
    });
  }

  async delete(materialCode: string) {
    await db.delete(inventoryRolls).where(eq(inventoryRolls.materialCode, materialCode));
  }
}

export const inventoryRollRepository = new InventoryRollRepository();
