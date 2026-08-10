import { db, type Tx } from "@db/index";
import {
  productionOrders,
  productionOrderLines,
  productionStageEvents,
  productionRollIssuances,
  inventoryRolls,
  inventoryRollMovements,
  workOrders,
  brands,
  companies,
  machines,
  operators,
} from "@db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "@api/utils/ApiError";

/** Append-only history (issuances, stage events) grows without bound — cap reads by default. */
export const DEFAULT_HISTORY_LIMIT = 200;
export interface PageOpts {
  limit?: number;
  offset?: number;
}
import type {
  ProductionOrder,
  ProductionOrderLine,
  NewProductionOrder,
  NewProductionOrderLine,
  NewProductionStageEvent,
  WorkOrder,
} from "@db/schema";

/**
 * Work order status mirrors its production order and is never set by hand:
 * `planned`/`production` -> `production`, `complete` -> `complete`.
 */
function workOrderStatusFor(productionStatus: ProductionOrder["status"]): WorkOrder["status"] {
  return productionStatus === "complete" ? "complete" : "production";
}

/**
 * Propagates a production order's status to its sales order inside the caller's
 * transaction, so the two can never be observed disagreeing.
 */
async function syncWorkOrderStatusTx(
  tx: Tx,
  productionOrderId: number,
  productionStatus?: ProductionOrder["status"]
) {
  if (!productionStatus) return;
  const [order] = await tx
    .select({ workOrderId: productionOrders.workOrderId })
    .from(productionOrders)
    .where(eq(productionOrders.id, productionOrderId));
  if (!order) return;

  await tx
    .update(workOrders)
    .set({ status: workOrderStatusFor(productionStatus), updatedAt: new Date() })
    // `dispatched` is terminal and owned by dispatch, not production. Without this guard a
    // later progress edit would silently drag a shipped order back to `complete`.
    .where(and(eq(workOrders.id, order.workOrderId), sql`${workOrders.status} <> 'dispatched'`));
}

/**
 * A production order is always read together with its sales order, brand and company —
 * the production order itself stores none of that (see production-orders.table.ts).
 */
const productionOrderSelect = {
  id: productionOrders.id,
  productionNumber: productionOrders.productionNumber,
  workOrderId: productionOrders.workOrderId,
  totalQty: productionOrders.totalQty,
  status: productionOrders.status,
  notes: productionOrders.notes,
  createdByUserId: productionOrders.createdByUserId,
  plannedAt: productionOrders.plannedAt,
  completedAt: productionOrders.completedAt,
  createdAt: productionOrders.createdAt,
  updatedAt: productionOrders.updatedAt,
  soNumber: workOrders.soNumber,
  poNumber: workOrders.poNumber,
  orderDate: workOrders.orderDate,
  dueDate: workOrders.dueDate,
  salesOrderQty: workOrders.totalQty,
  priority: workOrders.priority,
  /** Which workflow this order runs — the dashboard branches on it. */
  productType: workOrders.productType,
  brandId: brands.id,
  brandName: brands.name,
  companyId: companies.id,
  companyName: companies.name,
};

/**
 * NOTE ON LAYERING: repositories normally hold no business rules and throw no domain
 * errors — that's the service's job. The transactional methods here are the deliberate
 * exception: guards like "not enough stock" (`drawStockTx`) and "line was deleted"
 * (`applyLineChangeTransaction`) MUST run *inside* the same transaction as the write they
 * protect (after a `FOR UPDATE` lock), so they can't be lifted into the service without
 * losing atomicity. Those throws are intentional; don't add non-transactional business
 * rules here.
 */
export class ProductionOrderRepository {
  async findAll(filters?: { status?: string; soNumber?: string; poNumber?: string; workOrderId?: number }) {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(productionOrders.status, filters.status as ProductionOrder["status"]));
    }
    // Partial, case-insensitive search on SO / PO number.
    if (filters?.soNumber) conditions.push(sql`${workOrders.soNumber} ILIKE ${"%" + filters.soNumber + "%"}`);
    if (filters?.poNumber) conditions.push(sql`${workOrders.poNumber} ILIKE ${"%" + filters.poNumber + "%"}`);
    if (filters?.workOrderId) conditions.push(eq(productionOrders.workOrderId, filters.workOrderId));

    const orders = await db
      .select(productionOrderSelect)
      .from(productionOrders)
      .innerJoin(workOrders, eq(productionOrders.workOrderId, workOrders.id))
      .leftJoin(brands, eq(workOrders.brandId, brands.id))
      .leftJoin(companies, eq(brands.companyId, companies.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(productionOrders.createdAt));

    if (orders.length === 0) return [];

    const orderIds = orders.map((o) => o.id);
    const lineData = await db
      .select({
        productionOrderId: productionOrderLines.productionOrderId,
        printingMachineId: productionOrderLines.printingMachineId,
        cuttingMachineId: productionOrderLines.cuttingMachineId,
        quantity: productionOrderLines.quantity,
      })
      .from(productionOrderLines)
      .where(inArray(productionOrderLines.productionOrderId, orderIds));

    const allMachinesList = await db.select({ id: machines.id, name: machines.name }).from(machines);
    const machineById = new Map(allMachinesList.map((m) => [m.id, m.name]));

    const machineMap = new Map<number, Set<string>>();
    const plannedQtyMap = new Map<number, number>();

    for (const lm of lineData) {
      if (!machineMap.has(lm.productionOrderId)) {
        machineMap.set(lm.productionOrderId, new Set<string>());
      }
      const set = machineMap.get(lm.productionOrderId)!;
      if (lm.printingMachineId && machineById.has(lm.printingMachineId)) {
        set.add(machineById.get(lm.printingMachineId)!);
      }
      if (lm.cuttingMachineId && machineById.has(lm.cuttingMachineId)) {
        set.add(machineById.get(lm.cuttingMachineId)!);
      }

      const prevPlanned = plannedQtyMap.get(lm.productionOrderId) || 0;
      plannedQtyMap.set(lm.productionOrderId, prevPlanned + Number(lm.quantity || 0));
    }

    return orders.map((order) => {
      const set = machineMap.get(order.id);
      const machineName = set && set.size > 0 ? Array.from(set).join(", ") : null;
      const plannedQty = plannedQtyMap.get(order.id) || 0;
      const unplannedQty = Math.max(0, Number(order.totalQty || 0) - plannedQty);
      return { ...order, machineName, plannedQty, unplannedQty };
    });
  }

  async findById(id: number | string) {
    const [row] = await db
      .select(productionOrderSelect)
      .from(productionOrders)
      .innerJoin(workOrders, eq(productionOrders.workOrderId, workOrders.id))
      .leftJoin(brands, eq(workOrders.brandId, brands.id))
      .leftJoin(companies, eq(brands.companyId, companies.id))
      .where(eq(productionOrders.id, Number(id)));
    if (!row) return undefined;

    const rawLines = await db
      .select({
        printingMachineId: productionOrderLines.printingMachineId,
        cuttingMachineId: productionOrderLines.cuttingMachineId,
      })
      .from(productionOrderLines)
      .where(eq(productionOrderLines.productionOrderId, Number(id)));

    const allMachinesList = await db.select({ id: machines.id, name: machines.name }).from(machines);
    const machineById = new Map(allMachinesList.map((m) => [m.id, m.name]));

    const set = new Set<string>();
    for (const l of rawLines) {
      if (l.printingMachineId && machineById.has(l.printingMachineId)) {
        set.add(machineById.get(l.printingMachineId)!);
      }
      if (l.cuttingMachineId && machineById.has(l.cuttingMachineId)) {
        set.add(machineById.get(l.cuttingMachineId)!);
      }
    }
    const machineName = set.size > 0 ? Array.from(set).join(", ") : null;

    return { ...row, machineName };
  }

  async findRawById(id: number | string) {
    const [row] = await db.select().from(productionOrders).where(eq(productionOrders.id, Number(id)));
    return row;
  }

  async findByWorkOrderId(workOrderId: number | string) {
    const [row] = await db
      .select()
      .from(productionOrders)
      .where(eq(productionOrders.workOrderId, Number(workOrderId)));
    return row;
  }

  async findLastProductionNumber() {
    const [row] = await db
      .select({ productionNumber: productionOrders.productionNumber })
      .from(productionOrders)
      .orderBy(desc(productionOrders.id))
      .limit(1);
    return row?.productionNumber;
  }

  async create(data: NewProductionOrder) {
    const [row] = await db.insert(productionOrders).values(data).returning();
    return row;
  }

  /**
   * Creates a production order and flips its sales order to `production` in one
   * transaction, so the two can't be left disagreeing if the process dies between them.
   * A unique-violation (duplicate production number, or a concurrent order for the same
   * sales order) rolls the whole thing back and propagates to the caller.
   */
  async createWithWorkOrderStatusTx(data: NewProductionOrder) {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(productionOrders).values(data).returning();
      await tx
        .update(workOrders)
        .set({ status: "production", updatedAt: new Date() })
        .where(eq(workOrders.id, data.workOrderId));
      return row;
    });
  }

  async update(id: number | string, data: Partial<ProductionOrder>) {
    const [row] = await db
      .update(productionOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productionOrders.id, Number(id)))
      .returning();
    return row;
  }

  async delete(id: number | string) {
    await db.delete(productionOrders).where(eq(productionOrders.id, Number(id)));
  }

  /* ---------------- Lines ---------------- */

  async findLines(productionOrderId: number | string) {
    return db
      .select()
      .from(productionOrderLines)
      .where(eq(productionOrderLines.productionOrderId, Number(productionOrderId)))
      .orderBy(productionOrderLines.id);
  }

  async findLineById(lineId: number | string) {
    const [row] = await db
      .select()
      .from(productionOrderLines)
      .where(eq(productionOrderLines.id, Number(lineId)));
    return row;
  }

  async updateLine(lineId: number | string, data: Partial<ProductionOrderLine>) {
    const [row] = await db
      .update(productionOrderLines)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productionOrderLines.id, Number(lineId)))
      .returning();
    return row;
  }

  /**
   * Settles one line's inventory draw inside the caller's transaction.
   *
   * `SELECT ... FOR UPDATE` takes a row lock on the material's ledger first, so two
   * planners reserving the same material serialise here instead of both reading the same
   * balance and both passing the check. The post-write balance assertion is the backstop.
   */
  private async drawStockTx(
    tx: Tx,
    lineId: number,
    materialCode: string | null | undefined,
    rolls: number,
    actorUserId?: number | null
  ) {
    if (!materialCode || !(rolls > 0)) return;

    await tx
      .select({ id: inventoryRolls.id })
      .from(inventoryRolls)
      .where(eq(inventoryRolls.materialCode, materialCode))
      .for("update");

    await tx.insert(productionRollIssuances).values({
      productionOrderLineId: lineId,
      materialCode,
      rolls: String(rolls),
      note: "Reserved during production planning",
      actorUserId: actorUserId ?? null,
    });

    const [stock] = await tx
      .update(inventoryRolls)
      .set({
        issuedRolls: sql`${inventoryRolls.issuedRolls} + ${rolls}`,
        balanceRolls: sql`${inventoryRolls.balanceRolls} - ${rolls}`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryRolls.materialCode, materialCode))
      .returning();

    if (!stock || Number(stock.balanceRolls) < 0) {
      throw new BadRequestError(
        `Cannot assign ${rolls} rolls of ${materialCode}: not enough stock`
      );
    }
  }

  /** Credits one line's entire draw back to stock and clears its issuance history. */
  private async releaseLineStockTx(tx: Tx, lineId: number) {
    const drawn = await tx
      .select({
        materialCode: productionRollIssuances.materialCode,
        rolls: sql<string>`sum(${productionRollIssuances.rolls})`,
      })
      .from(productionRollIssuances)
      .where(eq(productionRollIssuances.productionOrderLineId, lineId))
      .groupBy(productionRollIssuances.materialCode);

    for (const row of drawn) {
      // `sum()` comes back as a string; convert to a number so it's bound as a numeric
      // param rather than relying on Postgres implicitly casting text in `numeric + $1`.
      const rolls = Number(row.rolls);
      await tx
        .update(inventoryRolls)
        .set({
          issuedRolls: sql`${inventoryRolls.issuedRolls} - ${rolls}`,
          balanceRolls: sql`${inventoryRolls.balanceRolls} + ${rolls}`,
          updatedAt: new Date(),
        })
        .where(eq(inventoryRolls.materialCode, row.materialCode));
    }

    await tx
      .delete(productionRollIssuances)
      .where(eq(productionRollIssuances.productionOrderLineId, lineId));
  }

  /** Re-derives the order status from its lines and pushes it to the sales order. */
  private async resyncOrderTx(
    tx: Tx,
    productionOrderId: number,
    derive: (lines: ProductionOrderLine[]) => Partial<ProductionOrder>
  ) {
    const siblings = await tx
      .select()
      .from(productionOrderLines)
      .where(eq(productionOrderLines.productionOrderId, productionOrderId));

    const patch = derive(siblings);
    await tx
      .update(productionOrders)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(productionOrders.id, productionOrderId));

    await syncWorkOrderStatusTx(tx, productionOrderId, patch.status);
  }

  /**
   * Serialises resource assignment. Locks the machine/operator rows being claimed (sorted
   * ascending, machines before operators, to avoid deadlocks between two assigning
   * transactions) and then re-checks — inside the same transaction — that none is already
   * held by another active line. Two planners racing for the same machine now serialise on
   * the row lock, and the loser gets a clean 400 instead of both silently sharing it. This
   * is the authoritative backstop; the service's pre-transaction check is just a fast-fail.
   */
  private async lockResourcesTx(
    tx: Tx,
    machineIds: number[],
    operatorIds: number[],
    excludeLineId: number | null
  ) {
    const machineSet = [...new Set(machineIds)].sort((a, b) => a - b);
    const operatorSet = [...new Set(operatorIds)].sort((a, b) => a - b);
    if (machineSet.length === 0 && operatorSet.length === 0) return;

    if (machineSet.length > 0) {
      await tx.select({ id: machines.id }).from(machines).where(inArray(machines.id, machineSet)).for("update");
    }
    if (operatorSet.length > 0) {
      await tx.select({ id: operators.id }).from(operators).where(inArray(operators.id, operatorSet)).for("update");
    }

    // A resource is held while its line is not completed and its order is not complete.
    const conditions = [
      sql`${productionOrderLines.status} <> 'completed'`,
      sql`${productionOrders.status} <> 'complete'`,
    ];
    if (excludeLineId != null) conditions.push(sql`${productionOrderLines.id} <> ${excludeLineId}`);

    const rows = await tx
      .select({
        productionNumber: productionOrders.productionNumber,
        labelType: productionOrderLines.labelType,
        printingMachineId: productionOrderLines.printingMachineId,
        cuttingMachineId: productionOrderLines.cuttingMachineId,
        printingOperatorId: productionOrderLines.printingOperatorId,
        cuttingOperatorId: productionOrderLines.cuttingOperatorId,
        packagingOperatorId: productionOrderLines.packagingOperatorId,
      })
      .from(productionOrderLines)
      .innerJoin(productionOrders, eq(productionOrderLines.productionOrderId, productionOrders.id))
      .where(and(...conditions));

    const heldMachines = new Map<number, string>();
    const heldOperators = new Map<number, string>();
    for (const r of rows) {
      const where = `${r.productionNumber} · ${r.labelType}`;
      for (const id of [r.printingMachineId, r.cuttingMachineId]) if (id != null) heldMachines.set(id, where);
      for (const id of [r.printingOperatorId, r.cuttingOperatorId, r.packagingOperatorId]) {
        if (id != null) heldOperators.set(id, where);
      }
    }
    for (const id of machineSet) {
      const heldBy = heldMachines.get(id);
      if (heldBy) throw new BadRequestError(`That machine is already assigned to ${heldBy}`);
    }
    for (const id of operatorSet) {
      const heldBy = heldOperators.get(id);
      if (heldBy) throw new BadRequestError(`That operator is already assigned to ${heldBy}`);
    }
  }

  /** Machine/operator ids being set (to non-null) by a line patch — what needs locking. */
  private resourceIdsFromPatch(patch: Partial<ProductionOrderLine>) {
    const machineIds = [patch.printingMachineId, patch.cuttingMachineId].filter(
      (id): id is number => id != null
    );
    const operatorIds = [
      patch.printingOperatorId,
      patch.cuttingOperatorId,
      patch.packagingOperatorId,
    ].filter((id): id is number => id != null);
    return { machineIds, operatorIds };
  }

  /**
   * Plans ONE label type and reserves everything it needs in a single transaction:
   * the line row, its material draw from inventory, and its printing machine and operator
   * (locked + re-checked via `lockResourcesTx`).
   *
   * Planning is per-label-type rather than all-at-once so that submitting "Care Label"
   * locks its resources immediately, before "Size Label" is even entered.
   */
  async createLinePlanTransaction(
    productionOrderId: number,
    row: Omit<NewProductionOrderLine, "productionOrderId"> & { assignedRolls: number },
    derive: (lines: ProductionOrderLine[]) => Partial<ProductionOrder>,
    actorUserId?: number | null
  ) {
    const { assignedRolls, ...line } = row;
    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(productionOrderLines)
        .values({ ...line, productionOrderId, issuedRolls: String(assignedRolls) })
        .returning();

      // Lock + re-check the printing machine/operator before drawing stock, excluding the
      // line we just inserted (it's the legitimate new holder).
      const { machineIds, operatorIds } = this.resourceIdsFromPatch(inserted);
      await this.lockResourcesTx(tx, machineIds, operatorIds, inserted.id);

      await this.drawStockTx(tx, inserted.id, line.materialCode, assignedRolls, actorUserId);
      await this.resyncOrderTx(tx, productionOrderId, derive);
      return inserted;
    });
  }

  /**
   * Re-plans ONE label type. Its previous draw is credited back before the new one is
   * taken, so changing the material or lowering the assigned rolls settles correctly
   * rather than double-counting.
   */
  async updateLinePlanTransaction(
    lineId: number,
    productionOrderId: number,
    row: Partial<NewProductionOrderLine> & { assignedRolls: number },
    derive: (lines: ProductionOrderLine[]) => Partial<ProductionOrder>,
    actorUserId?: number | null
  ) {
    const { assignedRolls, ...line } = row;
    return db.transaction(async (tx) => {
      await this.releaseLineStockTx(tx, lineId);

      const [updated] = await tx
        .update(productionOrderLines)
        .set({ ...line, issuedRolls: String(assignedRolls), updatedAt: new Date() })
        .where(eq(productionOrderLines.id, lineId))
        .returning();

      // Lock + re-check the (re-planned) printing machine/operator, excluding this line.
      const { machineIds, operatorIds } = this.resourceIdsFromPatch(updated);
      await this.lockResourcesTx(tx, machineIds, operatorIds, lineId);

      await this.drawStockTx(tx, lineId, line.materialCode, assignedRolls, actorUserId);
      await this.resyncOrderTx(tx, productionOrderId, derive);
      return updated;
    });
  }

  /**
   * Cancels ONE label type: its rolls go back to stock and its machine/operator are
   * released (they are only ever held *by* a line, so deleting the line frees them).
   */
  async deleteLineTransaction(
    lineId: number,
    productionOrderId: number,
    derive: (lines: ProductionOrderLine[]) => Partial<ProductionOrder>
  ) {
    return db.transaction(async (tx) => {
      await this.releaseLineStockTx(tx, lineId);
      await tx.delete(productionOrderLines).where(eq(productionOrderLines.id, lineId));
      await this.resyncOrderTx(tx, productionOrderId, derive);
    });
  }

  /** Credits an order's entire inventory draw back to stock — used when it is deleted. */
  async releaseOrderInventoryTransaction(productionOrderId: number) {
    return db.transaction(async (tx) => {
      const previous = await tx
        .select({
          materialCode: productionRollIssuances.materialCode,
          rolls: sql<string>`sum(${productionRollIssuances.rolls})`,
        })
        .from(productionRollIssuances)
        .innerJoin(
          productionOrderLines,
          eq(productionRollIssuances.productionOrderLineId, productionOrderLines.id)
        )
        .where(eq(productionOrderLines.productionOrderId, productionOrderId))
        .groupBy(productionRollIssuances.materialCode);

      for (const row of previous) {
        const rolls = Number(row.rolls);
        await tx
          .update(inventoryRolls)
          .set({
            issuedRolls: sql`${inventoryRolls.issuedRolls} - ${rolls}`,
            balanceRolls: sql`${inventoryRolls.balanceRolls} + ${rolls}`,
            updatedAt: new Date(),
          })
          .where(eq(inventoryRolls.materialCode, row.materialCode));
      }

      const [order] = await tx
        .select({ workOrderId: productionOrders.workOrderId })
        .from(productionOrders)
        .where(eq(productionOrders.id, productionOrderId));

      await tx.delete(productionOrders).where(eq(productionOrders.id, productionOrderId));

      // With no production order left, the sales order goes back to being freely editable.
      if (order) {
        await tx
          .update(workOrders)
          .set({ status: "initiate_production", updatedAt: new Date() })
          .where(eq(workOrders.id, order.workOrderId));
      }
    });
  }

  /**
   * Writes a counter change and its audit event atomically, then re-derives the parent
   * order's status from the resulting line set. Keeping all three in one transaction is
   * what stops the order status from drifting away from its lines.
   *
   * The line is locked `FOR UPDATE` and the patch is computed *inside* the lock, from the
   * freshly-read row, via `compute`. That is what prevents a lost update: two supervisors
   * editing the same line no longer both compute against a stale snapshot and let the later
   * write silently clobber the earlier one — the second edit waits for the lock, then
   * recomputes (and re-validates, throwing to roll back) against committed state.
   */
  async applyLineChangeTransaction(
    lineId: number,
    compute: (line: ProductionOrderLine) => {
      linePatch: Partial<ProductionOrderLine>;
      event: Omit<NewProductionStageEvent, "productionOrderLineId">;
    },
    deriveOrderPatch: (lines: ProductionOrderLine[]) => Partial<ProductionOrder>
  ) {
    return db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(productionOrderLines)
        .where(eq(productionOrderLines.id, lineId))
        .for("update");
      if (!locked) throw new NotFoundError("Production order line not found");

      // Compute (and validate) against the locked row. A thrown ApiError rolls the tx back.
      const { linePatch, event } = compute(locked);

      // If this change assigns any machine/operator, lock + re-check them here so a
      // concurrent assignment of the same resource to another line can't slip through.
      const { machineIds, operatorIds } = this.resourceIdsFromPatch(linePatch);
      await this.lockResourcesTx(tx, machineIds, operatorIds, lineId);

      const [line] = await tx
        .update(productionOrderLines)
        .set({ ...linePatch, updatedAt: new Date() })
        .where(eq(productionOrderLines.id, lineId))
        .returning();

      await tx.insert(productionStageEvents).values({ ...event, productionOrderLineId: lineId });

      const siblings = await tx
        .select()
        .from(productionOrderLines)
        .where(eq(productionOrderLines.productionOrderId, line.productionOrderId));

      const orderPatch = deriveOrderPatch(siblings);
      await tx
        .update(productionOrders)
        .set({ ...orderPatch, updatedAt: new Date() })
        .where(eq(productionOrders.id, line.productionOrderId));

      await syncWorkOrderStatusTx(tx, line.productionOrderId, orderPatch.status);

      return line;
    });
  }

  /**
   * Issues material to a production line: records the issuance, bumps the line's
   * denormalized `issuedRolls`, and debits inventory — all atomically. This is the only
   * write path that reduces `inventory_rolls.balanceRolls`.
   */
  async issueRollsTransaction(
    lineId: number,
    materialCode: string,
    rolls: number,
    note?: string,
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      const [issuance] = await tx
        .insert(productionRollIssuances)
        .values({
          productionOrderLineId: lineId,
          materialCode,
          rolls: String(rolls),
          note,
          actorUserId: actorUserId ?? null,
        })
        .returning();

      await tx
        .update(productionOrderLines)
        .set({
          issuedRolls: sql`${productionOrderLines.issuedRolls} + ${rolls}`,
          updatedAt: new Date(),
        })
        .where(eq(productionOrderLines.id, lineId));

      await tx
        .update(inventoryRolls)
        .set({
          issuedRolls: sql`${inventoryRolls.issuedRolls} + ${rolls}`,
          balanceRolls: sql`${inventoryRolls.balanceRolls} - ${rolls}`,
          updatedAt: new Date(),
        })
        .where(eq(inventoryRolls.materialCode, materialCode));

      return issuance;
    });
  }

  async findLineIssuances(lineId: number | string, opts?: PageOpts) {
    return db
      .select()
      .from(productionRollIssuances)
      .where(eq(productionRollIssuances.productionOrderLineId, Number(lineId)))
      .orderBy(desc(productionRollIssuances.createdAt))
      .limit(opts?.limit ?? DEFAULT_HISTORY_LIMIT)
      .offset(opts?.offset ?? 0);
  }

  async findLineEvents(lineId: number | string, opts?: PageOpts) {
    return db
      .select()
      .from(productionStageEvents)
      .where(eq(productionStageEvents.productionOrderLineId, Number(lineId)))
      .orderBy(desc(productionStageEvents.createdAt))
      .limit(opts?.limit ?? DEFAULT_HISTORY_LIMIT)
      .offset(opts?.offset ?? 0);
  }

  async findOrderEvents(productionOrderId: number | string, opts?: PageOpts) {
    return db
      .select({
        id: productionStageEvents.id,
        productionOrderLineId: productionStageEvents.productionOrderLineId,
        labelType: productionOrderLines.labelType,
        eventType: productionStageEvents.eventType,
        previousValue: productionStageEvents.previousValue,
        newValue: productionStageEvents.newValue,
        delta: productionStageEvents.delta,
        actorUserId: productionStageEvents.actorUserId,
        note: productionStageEvents.note,
        createdAt: productionStageEvents.createdAt,
      })
      .from(productionStageEvents)
      .innerJoin(productionOrderLines, eq(productionStageEvents.productionOrderLineId, productionOrderLines.id))
      .where(eq(productionOrderLines.productionOrderId, Number(productionOrderId)))
      .orderBy(desc(productionStageEvents.createdAt))
      .limit(opts?.limit ?? DEFAULT_HISTORY_LIMIT)
      .offset(opts?.offset ?? 0);
  }

  /**
   * Every machine and operator currently held by an **active** production line, with the
   * line and order holding it. A resource is locked while its line is not yet `completed`
   * and its order is not yet `complete`; finishing the work (or clearing the assignment)
   * releases it automatically, so there is no separate "unlock" step to forget.
   */
  async findResourceAssignments(exclude?: { lineId?: number; productionOrderId?: number }) {
    const conditions = [
      sql`${productionOrderLines.status} <> 'completed'`,
      sql`${productionOrders.status} <> 'complete'`,
    ];
    if (exclude?.lineId) conditions.push(sql`${productionOrderLines.id} <> ${exclude.lineId}`);
    if (exclude?.productionOrderId) {
      conditions.push(sql`${productionOrderLines.productionOrderId} <> ${exclude.productionOrderId}`);
    }

    return db
      .select({
        lineId: productionOrderLines.id,
        labelType: productionOrderLines.labelType,
        productionOrderId: productionOrderLines.productionOrderId,
        productionNumber: productionOrders.productionNumber,
        printingMachineId: productionOrderLines.printingMachineId,
        printingOperatorId: productionOrderLines.printingOperatorId,
        cuttingMachineId: productionOrderLines.cuttingMachineId,
        cuttingOperatorId: productionOrderLines.cuttingOperatorId,
        packagingOperatorId: productionOrderLines.packagingOperatorId,
      })
      .from(productionOrderLines)
      .innerJoin(productionOrders, eq(productionOrderLines.productionOrderId, productionOrders.id))
      .where(and(...conditions));
  }

  /**
   * Every machine/operator assignment that exists, with the state needed to classify how
   * busy the resource is: whether its line has started, and whether it has finished.
   * Unlike `findResourceAssignments` this does **not** filter to active lines — finished
   * work is what distinguishes a "Completed" operator from an idle one.
   */
  async findResourceUsage() {
    return db
      .select({
        lineId: productionOrderLines.id,
        lineStatus: productionOrderLines.status,
        orderStatus: productionOrders.status,
        productionNumber: productionOrders.productionNumber,
        labelType: productionOrderLines.labelType,
        printedRolls: productionOrderLines.printedRolls,
        cutRolls: productionOrderLines.cutRolls,
        packagedRolls: productionOrderLines.packagedRolls,
        printingMachineId: productionOrderLines.printingMachineId,
        printingOperatorId: productionOrderLines.printingOperatorId,
        cuttingMachineId: productionOrderLines.cuttingMachineId,
        cuttingOperatorId: productionOrderLines.cuttingOperatorId,
        packagingOperatorId: productionOrderLines.packagingOperatorId,
      })
      .from(productionOrderLines)
      .innerJoin(productionOrders, eq(productionOrderLines.productionOrderId, productionOrders.id));
  }

  /** Total rolls drawn from inventory by every line of one production order, per material. */
  async findOrderIssuanceTotals(productionOrderId: number | string) {
    return db
      .select({
        materialCode: productionRollIssuances.materialCode,
        rolls: sql<string>`sum(${productionRollIssuances.rolls})`,
      })
      .from(productionRollIssuances)
      .innerJoin(
        productionOrderLines,
        eq(productionRollIssuances.productionOrderLineId, productionOrderLines.id)
      )
      .where(eq(productionOrderLines.productionOrderId, Number(productionOrderId)))
      .groupBy(productionRollIssuances.materialCode);
  }

  /** Work orders still in production (not completed) that don't yet have a production order. */
  async findEligibleWorkOrders() {
    return db
      .select({
        id: workOrders.id,
        soNumber: workOrders.soNumber,
        poNumber: workOrders.poNumber,
        orderDate: workOrders.orderDate,
        dueDate: workOrders.dueDate,
        totalQty: workOrders.totalQty,
        productType: workOrders.productType,
        brandId: brands.id,
        brandName: brands.name,
        companyId: companies.id,
        companyName: companies.name,
      })
      .from(workOrders)
      .leftJoin(brands, eq(workOrders.brandId, brands.id))
      .leftJoin(companies, eq(brands.companyId, companies.id))
      .where(
        and(
          eq(workOrders.status, "initiate_production"),
          sql`NOT EXISTS (SELECT 1 FROM ${productionOrders} WHERE ${productionOrders.workOrderId} = ${workOrders.id})`
        )
      )
      .orderBy(desc(workOrders.createdAt));
  }

  /**
   * Reconciles stock for a finished production line:
   * Records usedRolls, usedWeight, extraRollsReturned, extraWeight, and reconciledAt.
   * Automatically credits extraRollsReturned rolls back to main inventory (inventory_rolls)
   * and writes an append-only inventory_roll_movements history entry.
   */
  async reconcileLineStockTransaction(
    lineId: number,
    data: {
      usedRolls: number;
      usedWeight: number;
      extraRollsReturned: number;
      extraWeight: number;
      actorUserId?: number | null;
    }
  ) {
    return db.transaction(async (tx) => {
      const [line] = await tx
        .select()
        .from(productionOrderLines)
        .where(eq(productionOrderLines.id, lineId));
      if (!line) throw new NotFoundError("Production order line not found");

      const previousReturned = Number(line.extraRollsReturned ?? 0);
      const newReturned = Number(data.extraRollsReturned);
      const deltaReturned = newReturned - previousReturned;

      const [updatedLine] = await tx
        .update(productionOrderLines)
        .set({
          usedRolls: String(data.usedRolls),
          usedWeight: String(data.usedWeight),
          extraRollsReturned: String(data.extraRollsReturned),
          extraWeight: String(data.extraWeight),
          reconciledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(productionOrderLines.id, lineId))
        .returning();

      if (deltaReturned !== 0 && line.materialCode) {
        const [stock] = await tx
          .select()
          .from(inventoryRolls)
          .where(eq(inventoryRolls.materialCode, line.materialCode));

        if (stock) {
          const newIssued = Math.max(0, Number(stock.issuedRolls) - deltaReturned);
          const newBalance = Math.max(0, Number(stock.balanceRolls) + deltaReturned);

          await tx
            .update(inventoryRolls)
            .set({
              issuedRolls: String(newIssued),
              balanceRolls: String(newBalance),
              updatedAt: new Date(),
            })
            .where(eq(inventoryRolls.id, stock.id));

          await tx.insert(inventoryRollMovements).values({
            inventoryRollId: stock.id,
            materialCode: line.materialCode,
            movementType: "production_release",
            rolls: String(deltaReturned),
            balanceAfter: String(newBalance),
            referenceType: "production_order_line",
            referenceId: lineId,
            note: `Stock reconciliation return for ${line.labelType} (${data.extraRollsReturned} rolls returned, ${data.extraWeight} kg extra)`,
            actorUserId: data.actorUserId ?? null,
          });
        }
      }

      return updatedLine;
    });
  }
}

export const productionOrderRepository = new ProductionOrderRepository();
