import { db, type Tx } from "@db/index";
import {
  wovenProductionLines,
  wovenThreadPlanItems,
  productionOrders,
  workOrders,
  machines,
  operators,
  wovenWorkOrderDetails,
} from "@db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { NotFoundError } from "@shared/errors/ApiError";
import { threadInventoryRepository, type Denier } from "@modules/thread/thread-inventory/thread-inventory.repository";
import type {
  ProductionOrder,
  WovenProductionLine,
  NewWovenProductionLine,
} from "@db/schema";

/** One planned colour as supplied by the client. Weight is what the loom will consume. */
export interface ThreadPlanInput {
  sortOrder: number;
  colorName: string;
  denier: Denier;
  colorCode: string;
  weightKg: number;
  threadStockId?: number | null;
}

/** Reference tag used on every thread movement a woven line causes. */
const PLAN_REF = "woven_production_line";

/**
 * Woven production lines and their thread plans.
 *
 * Planning is the only stage that touches inventory, and it does so exactly like the
 * printed side's material draw: inside one transaction, with the stock rows locked, so a
 * shortfall on the last colour rolls back the ones already taken.
 */
export class WovenProductionRepository {
  async findLines(productionOrderId: number | string) {
    return db
      .select()
      .from(wovenProductionLines)
      .where(eq(wovenProductionLines.productionOrderId, Number(productionOrderId)))
      .orderBy(wovenProductionLines.id);
  }

  async findLineById(lineId: number | string) {
    const [row] = await db
      .select()
      .from(wovenProductionLines)
      .where(eq(wovenProductionLines.id, Number(lineId)));
    return row;
  }

  async findThreadPlan(lineId: number | string) {
    return db
      .select()
      .from(wovenThreadPlanItems)
      .where(eq(wovenThreadPlanItems.wovenProductionLineId, Number(lineId)))
      .orderBy(wovenThreadPlanItems.sortOrder);
  }

  /** The woven order header, joined through to its sales order and loom spec. */
  async findOrderContext(productionOrderId: number | string) {
    const [row] = await db
      .select({
        productionOrderId: productionOrders.id,
        productionNumber: productionOrders.productionNumber,
        status: productionOrders.status,
        totalQty: productionOrders.totalQty,
        workOrderId: workOrders.id,
        soNumber: workOrders.soNumber,
        productType: workOrders.productType,
        pick: wovenWorkOrderDetails.pick,
        repeat: wovenWorkOrderDetails.repeat,
        density: wovenWorkOrderDetails.density,
        speed: wovenWorkOrderDetails.speed,
      })
      .from(productionOrders)
      .innerJoin(workOrders, eq(productionOrders.workOrderId, workOrders.id))
      .leftJoin(wovenWorkOrderDetails, eq(wovenWorkOrderDetails.workOrderId, workOrders.id))
      .where(eq(productionOrders.id, Number(productionOrderId)));
    return row;
  }

  /** Machine/operator names for the overview, resolved in one round trip. */
  async findResourceNames() {
    const [ms, os] = await Promise.all([
      db.select({ id: machines.id, name: machines.machineName }).from(machines),
      db.select({ id: operators.id, name: operators.name }).from(operators),
    ]);
    return { machines: ms, operators: os };
  }

  /**
   * Creates or re-plans a woven line together with its thread colours, settling inventory
   * in the same transaction: whatever the line previously held is credited back before the
   * new plan is drawn, so re-planning never double-counts.
   */
  async savePlanTransaction(
    productionOrderId: number,
    lineId: number | null,
    line: Partial<NewWovenProductionLine> & { quantity: string },
    threads: ThreadPlanInput[],
    derive: (lines: WovenProductionLine[]) => Partial<ProductionOrder>,
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      let target: WovenProductionLine;

      if (lineId) {
        const [locked] = await tx
          .select()
          .from(wovenProductionLines)
          .where(eq(wovenProductionLines.id, lineId))
          .for("update");
        if (!locked) throw new NotFoundError("Woven production line not found");

        // Give back everything this line was holding before drawing the new plan.
        await threadInventoryRepository.releaseForPlanTx(tx, PLAN_REF, lineId, actorUserId);
        await tx
          .delete(wovenThreadPlanItems)
          .where(eq(wovenThreadPlanItems.wovenProductionLineId, lineId));

        const [updated] = await tx
          .update(wovenProductionLines)
          .set({ ...line, updatedAt: new Date() })
          .where(eq(wovenProductionLines.id, lineId))
          .returning();
        target = updated;
      } else {
        const [created] = await tx
          .insert(wovenProductionLines)
          .values({ ...line, productionOrderId } as NewWovenProductionLine)
          .returning();
        target = created;
      }

      // Draw each colour: dyed stock first, undyed fallback second (see consumeForPlanTx).
      let totalWeight = 0;
      for (const thread of threads) {
        const slices = await threadInventoryRepository.consumeForPlanTx(
          tx,
          {
            denier: thread.denier,
            colorName: thread.colorName,
            colorCode: thread.colorCode,
            weightKg: thread.weightKg,
          },
          { referenceType: PLAN_REF, referenceId: target.id, actorUserId }
        );
        totalWeight += thread.weightKg;

        await tx.insert(wovenThreadPlanItems).values({
          wovenProductionLineId: target.id,
          sortOrder: thread.sortOrder,
          colorName: thread.colorName,
          denier: thread.denier,
          colorCode: thread.colorCode,
          weightKg: String(thread.weightKg),
          // Which ledger row satisfied it — explicit user selection or the first slice source.
          threadStockId: thread.threadStockId ?? slices[0]?.threadStockId ?? null,
        });
      }

      // Total thread weight is always server-calculated from the plan items.
      const [finalLine] = await tx
        .update(wovenProductionLines)
        .set({
          totalThreadWeightKg: String(totalWeight),
          planningCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(wovenProductionLines.id, target.id))
        .returning();

      await this.resyncOrderTx(tx, productionOrderId, derive);
      return finalLine;
    });
  }

  /** Cancels a woven line, returning its thread to stock. */
  async deleteLineTransaction(
    lineId: number,
    productionOrderId: number,
    derive: (lines: WovenProductionLine[]) => Partial<ProductionOrder>,
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      await threadInventoryRepository.releaseForPlanTx(tx, PLAN_REF, lineId, actorUserId);
      await tx.delete(wovenProductionLines).where(eq(wovenProductionLines.id, lineId));
      await this.resyncOrderTx(tx, productionOrderId, derive);
    });
  }

  /**
   * Applies a stage change (weaving / cutting / packaging) against the LOCKED line, so two
   * supervisors editing the same line can't lose each other's update — the same guarantee
   * the printed workflow gained in `applyLineChangeTransaction`.
   */
  async applyStageChangeTransaction(
    lineId: number,
    compute: (line: WovenProductionLine) => Partial<WovenProductionLine>,
    derive: (lines: WovenProductionLine[]) => Partial<ProductionOrder>
  ) {
    return db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(wovenProductionLines)
        .where(eq(wovenProductionLines.id, lineId))
        .for("update");
      if (!locked) throw new NotFoundError("Woven production line not found");

      const patch = compute(locked);
      const [line] = await tx
        .update(wovenProductionLines)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(wovenProductionLines.id, lineId))
        .returning();

      await this.resyncOrderTx(tx, line.productionOrderId, derive);
      return line;
    });
  }

  /**
   * Post-completion inventory reconciliation: returns remaining thread weights to stock,
   * updates remainingWeightKg and actualConsumedWeightKg on each thread item.
   */
  async reconcileRemainingThreadsTransaction(
    lineId: number,
    threads: { id: number; remainingWeightKg: number }[],
    actorUserId?: number | null
  ) {
    return db.transaction(async (tx) => {
      const [line] = await tx
        .select()
        .from(wovenProductionLines)
        .where(eq(wovenProductionLines.id, lineId))
        .for("update");
      if (!line) throw new NotFoundError("Woven production line not found");

      const existingThreads = await tx
        .select()
        .from(wovenThreadPlanItems)
        .where(eq(wovenThreadPlanItems.wovenProductionLineId, lineId));

      for (const inputThread of threads) {
        const target = existingThreads.find((t) => t.id === inputThread.id);
        if (!target) continue;

        const plannedWeight = Number(target.weightKg || 0);
        const remWeight = Math.max(0, Number(inputThread.remainingWeightKg || 0));

        if (remWeight > plannedWeight) {
          throw new Error(
            `Remaining weight (${remWeight} kg) for ${target.colorName} cannot exceed planned weight (${plannedWeight} kg)`
          );
        }

        const prevRemaining = Number(target.remainingWeightKg || 0);
        // Net weight to release back to inventory (delta if re-submitting)
        const weightDeltaToRelease = remWeight - prevRemaining;

        if (weightDeltaToRelease > 0 && target.threadStockId) {
          await threadInventoryRepository.moveStockTx(
            tx,
            target.threadStockId,
            weightDeltaToRelease,
            "production_release",
            {
              referenceType: PLAN_REF,
              referenceId: lineId,
              note: `Post-completion remaining thread return (${target.colorCode})`,
              actorUserId: actorUserId ?? null,
            }
          );
        }

        const actualConsumed = Math.max(0, plannedWeight - remWeight);
        await tx
          .update(wovenThreadPlanItems)
          .set({
            remainingWeightKg: String(remWeight),
            actualConsumedWeightKg: String(actualConsumed),
            updatedAt: new Date(),
          })
          .where(eq(wovenThreadPlanItems.id, target.id));
      }

      return tx
        .select()
        .from(wovenThreadPlanItems)
        .where(eq(wovenThreadPlanItems.wovenProductionLineId, lineId))
        .orderBy(wovenThreadPlanItems.sortOrder);
    });
  }

  /** Re-derives the parent order's status from its woven lines, inside the caller's tx. */
  private async resyncOrderTx(
    tx: Tx,
    productionOrderId: number,
    derive: (lines: WovenProductionLine[]) => Partial<ProductionOrder>
  ) {
    const siblings = await tx
      .select()
      .from(wovenProductionLines)
      .where(eq(wovenProductionLines.productionOrderId, productionOrderId));

    const patch = derive(siblings);
    await tx
      .update(productionOrders)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(productionOrders.id, productionOrderId));

    // Mirror the printed side: the sales order follows its production order's status.
    if (patch.status) {
      const [order] = await tx
        .select({ workOrderId: productionOrders.workOrderId })
        .from(productionOrders)
        .where(eq(productionOrders.id, productionOrderId));
      if (order) {
        await tx
          .update(workOrders)
          .set({
            status: patch.status === "complete" ? "complete" : "production",
            updatedAt: new Date(),
          })
          // `dispatched` is terminal and owned by dispatch — never downgrade it here.
          .where(and(eq(workOrders.id, order.workOrderId), sql`${workOrders.status} <> 'dispatched'`));
      }
    }
  }
}

export const wovenProductionRepository = new WovenProductionRepository();
