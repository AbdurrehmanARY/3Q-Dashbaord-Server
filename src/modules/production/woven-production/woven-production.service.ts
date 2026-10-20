import { wovenProductionRepository, type ThreadPlanInput } from "./woven-production.repository";
import { productionOrderRepository } from "../production-orders/production-order.repository";
import { userService } from "@modules/users/user.service";
import { beamThreadKgOf } from "../batch-and-runs/batch-flow.helpers";
import { mailService } from "@shared/services/mail.service";
import { ApiError, NotFoundError } from "@shared/errors/ApiError";
import { Messages, Entity } from "@shared/constants/messages";
import { validateSizePlan, type SizePlan } from "@shared/constants/labels";
import {
  MAX_THREAD_COLORS,
  toNumbers,
  deriveWovenLineStatus,
  deriveWovenOrderPatch,
  canStartCutting,
  canStartPackaging,
} from "./woven-production.helpers";
import type { ProductionOrder, WovenProductionLine } from "@db/schema";

export { MAX_THREAD_COLORS, deriveWovenOrderPatch };

export interface PlanWovenInput {
  /** One row per label type, exactly like the printed side. */
  labelType: string;
  quantity: number;
  /** Planned sizes — required by a Size Label and summed to `quantity`. */
  sizes?: SizePlan[];
  /** `sortOrder` is optional on the wire — the colour's position in the array supplies it. */
  threads: (Omit<ThreadPlanInput, "sortOrder"> & { sortOrder?: number })[];
  actorUserId?: number;
}

export class WovenProductionService {
  private async getLineOrThrow(lineId: number | string): Promise<WovenProductionLine> {
    const line = await wovenProductionRepository.findLineById(lineId);
    if (!line) throw new NotFoundError("Woven production line not found");
    return line;
  }

  private async getOrderOrThrow(id: number | string): Promise<ProductionOrder> {
    const order = await productionOrderRepository.findRawById(id);
    if (!order) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER));
    return order;
  }

  /** Rejects a production order that isn't running the woven workflow. */
  private async assertWoven(productionOrderId: number | string) {
    const ctx = await wovenProductionRepository.findOrderContext(productionOrderId);
    if (!ctx) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER));
    if (ctx.productType !== "woven") {
      throw new ApiError(
        "This production order runs the printed-labels workflow — use the printed planning endpoints",
        400
      );
    }
    return ctx;
  }

  async getOverview(productionOrderId: number | string) {
    const ctx = await this.assertWoven(productionOrderId);
    const lines = await wovenProductionRepository.findLines(productionOrderId);
    const { machines, operators } = await wovenProductionRepository.findResourceNames();

    const detailed = await Promise.all(
      lines.map(async (line) => {
        const n = toNumbers(line);
        const threads = await wovenProductionRepository.findThreadPlan(line.id);

        const pickVal = ctx?.pick ? Number(ctx.pick) : 0;
        const repeatVal = ctx?.repeat ? Number(ctx.repeat) : 0;
        const speedVal = ctx?.speed && Number(ctx.speed) > 0 ? Number(ctx.speed) : 600;

        /**
         * Dyed thread actually consumed by this line: the per-colour actuals once recorded,
         * otherwise what was reserved less what came back.
         */
        const dyedThreadUsedKg =
          Math.round(
            threads.reduce(
              (acc, t) =>
                acc +
                (t.actualConsumedWeightKg != null
                  ? Number(t.actualConsumedWeightKg)
                  : Math.max(0, Number(t.weightKg) - Number(t.remainingWeightKg || 0))),
              0
            ) * 1000
          ) / 1000;

        /** Thread left on the beam once the order is packaged. */
        const beamThreadKg = beamThreadKgOf(n.packagedWeightKg, dyedThreadUsedKg);

        const estimatedWeavingHours =
          repeatVal > 0 && pickVal > 0
            ? Math.round(((n.quantity / repeatVal) * pickVal / (speedVal * 60)) * 100) / 100
            : 0;

        let actualWeavingHours = 0;
        if (line.weavingStartedAt) {
          const startTime = new Date(line.weavingStartedAt).getTime();
          const endTime = line.weavingEndedAt ? new Date(line.weavingEndedAt).getTime() : Date.now();
          actualWeavingHours = Math.round((Math.max(0, endTime - startTime) / (3600 * 1000)) * 100) / 100;
        }

        const weavingTimeDiffHours =
          line.weavingStartedAt || estimatedWeavingHours > 0
            ? Math.round((actualWeavingHours - estimatedWeavingHours) * 100) / 100
            : 0;

        return {
          id: line.id,
          /** One woven line per label type, exactly like the printed side. */
          labelType: line.labelType,
          quantity: n.quantity,
          /** Planned sizes of a Size Label line — drives the per-size batch tracking. */
          sizes: line.sizes ?? [],
          status: line.status,
          planning: {
            totalThreadWeightKg: n.totalThreadWeightKg,
            completedAt: line.planningCompletedAt,
            threadCount: threads.length,
            /** Σ dyed thread this line actually consumed. */
            dyedThreadUsedKg,
            /** Packaged weight − dyed thread consumed. Signed: see `beamThreadKgOf`. */
            beamThreadKg,
            threads: threads.map((t) => ({
              id: t.id,
              sortOrder: t.sortOrder,
              colorName: t.colorName,
              denier: t.denier,
              colorCode: t.colorCode,
              weightKg: Number(t.weightKg),
              remainingWeightKg: Number(t.remainingWeightKg || 0),
              actualConsumedWeightKg:
                t.actualConsumedWeightKg != null
                  ? Number(t.actualConsumedWeightKg)
                  : Math.max(0, Number(t.weightKg) - Number(t.remainingWeightKg || 0)),
              threadStockId: t.threadStockId ?? null,
            })),
          },
          weaving: {
            wovenQty: n.wovenQty,
            status: line.weavingStatus,
            startedAt: line.weavingStartedAt,
            endedAt: line.weavingEndedAt,
            progressPct: n.quantity > 0 ? Math.round((n.wovenQty / n.quantity) * 10000) / 100 : 0,
            isComplete: n.quantity > 0 && n.wovenQty >= n.quantity,
            speedRpm: speedVal,
            estimatedWeavingHours,
            actualWeavingHours,
            weavingTimeDiffHours,
          },
          cutting: {
            cutQty: n.cutQty,
            cuttingDate: line.cuttingDate,
            /** Cutting cannot begin until weaving is 100% complete. */
            canStart: canStartCutting(line),
            isComplete: n.cutQty > 0 && n.cutQty >= n.wovenQty,
          },
          packaging: {
            packagedQty: n.packagedQty,
            packagedWeightKg: n.packagedWeightKg,
            packagingDate: line.packagingDate,
            /** Packaging cannot begin until cut quantity equals woven quantity. */
            canStart: canStartPackaging(line),
            isComplete: n.quantity > 0 && n.packagedQty >= n.quantity,
          },
        };
      })
    );

    const sum = (pick: (l: WovenProductionLine) => number) =>
      lines.reduce((acc, l) => acc + pick(l), 0);

    const totalThreadIssued = sum((l) => Number(l.totalThreadWeightKg));
    const remainingThreadReturned = detailed.reduce(
      (acc, line) =>
        acc + line.planning.threads.reduce((tAcc, t) => tAcc + (t.remainingWeightKg || 0), 0),
      0
    );
    const threadUsedInPackagedQuantity = sum((l) => Number(l.packagedWeightKg));
    const beamTotal = Math.max(0, totalThreadIssued - remainingThreadReturned - threadUsedInPackagedQuantity);

    return {
      productionOrder: ctx,
      lines: detailed,
      totals: {
        lineCount: lines.length,
        quantity: sum((l) => Number(l.quantity)),
        totalThreadWeightKg: totalThreadIssued,
        remainingThreadReturned,
        threadUsedInPackagedQuantity,
        beamTotal,
        /** Σ dyed thread consumed across every label type. */
        dyedThreadUsedKg: detailed.reduce((acc, l) => acc + l.planning.dyedThreadUsedKg, 0),
        /** Σ beam thread: packaged weight − dyed thread consumed, per label type. */
        beamThreadKg:
          Math.round(detailed.reduce((acc, l) => acc + l.planning.beamThreadKg, 0) * 1000) / 1000,
        wovenQty: sum((l) => Number(l.wovenQty)),
        cutQty: sum((l) => Number(l.cutQty)),
        packagedQty: sum((l) => Number(l.packagedQty)),
        packagedWeightKg: threadUsedInPackagedQuantity,
      },
    };
  }

  /**
   * Plans (or re-plans) a woven line: up to eight thread colours, a weaving machine and a
   * weaving operator. Submitting draws the thread from stock — dyed first, undyed as
   * fallback — and the whole thing rolls back if any colour is short.
   */
  async planLine(productionOrderId: number | string, lineId: number | null, input: PlanWovenInput) {
    await this.assertWoven(productionOrderId);
    const order = await this.getOrderOrThrow(productionOrderId);
    const actorUserId = await userService.assertActor(input.actorUserId);

    if (!(input.quantity > 0)) {
      throw new ApiError("Quantity must be greater than zero", 400);
    }
    const labelType = input.labelType?.trim();
    if (!labelType) {
      throw new ApiError("Label type is required", 400);
    }

    /*
     * Planning is per label type and incremental, so it cannot demand an exact total on
     * every submit. The rule is the printed one: never over-allocate. Cumulative planned
     * quantity may not exceed the order's, and a label type cannot be named twice.
     */
    const siblings = (await wovenProductionRepository.findLines(productionOrderId)).filter(
      (l) => l.id !== lineId
    );
    if (siblings.some((l) => l.labelType.trim().toLowerCase() === labelType.toLowerCase())) {
      throw new ApiError(`Label type '${labelType}' is already planned on this order`, 400);
    }

    const plannedBySiblings = siblings.reduce((n, l) => n + Number(l.quantity), 0);
    const orderQty = Number(order.totalQty);
    if (orderQty > 0 && plannedBySiblings + input.quantity > orderQty) {
      const remaining = Math.max(0, orderQty - plannedBySiblings);
      throw new ApiError(
        `Cannot plan ${input.quantity} pcs for '${labelType}': only ${remaining} of the ` +
          `order's ${orderQty} pcs remain unplanned`,
        400
      );
    }

    /**
     * A Size Label plans its sizes — "XS 200, SM 200, L 50" — which must add up to the
     * line's quantity exactly. That equality is what makes per-size remaining, and hence
     * "which sizes still need a batch", a figure the floor can act on.
     */
    const sizes = validateSizePlan(input.sizes, labelType, input.quantity, `'${labelType}'`);

    /* ---- Planning cannot proceed unless every required field is present ---- */
    if (input.threads.length === 0) {
      throw new ApiError("Planning requires at least one thread colour", 400);
    }
    if (input.threads.length > MAX_THREAD_COLORS) {
      throw new ApiError(`A woven line can use at most ${MAX_THREAD_COLORS} thread colours`, 400);
    }
    input.threads.forEach((t, i) => {
      const where = `Colour ${i + 1}`;
      if (!t.colorName?.trim()) throw new ApiError(`${where}: colour name is required`, 400);
      if (!t.colorCode?.trim()) throw new ApiError(`${where}: colour code is required`, 400);
      if (!t.denier) throw new ApiError(`${where}: denier count is required`, 400);
      if (!(t.weightKg > 0)) throw new ApiError(`${where}: weight must be greater than zero`, 400);
    });
    // Two slots cannot hold the same colour+code+denier — that is one colour, not two.
    const seen = new Set<string>();
    for (const t of input.threads) {
      const key = `${t.denier}|${t.colorName.trim().toLowerCase()}|${t.colorCode.trim().toLowerCase()}`;
      if (seen.has(key)) {
        throw new ApiError(`Thread colour '${t.colorName}' (${t.colorCode}) is listed twice`, 400);
      }
      seen.add(key);
    }

    if (lineId) {
      await this.getLineOrThrow(lineId);
    }

    return wovenProductionRepository.savePlanTransaction(
      Number(productionOrderId),
      lineId,
      {
        labelType,
        quantity: String(input.quantity),
        sizes,
      },
      input.threads.map((t, i) => ({ ...t, sortOrder: t.sortOrder ?? i + 1 })),
      (lines) => deriveWovenOrderPatch(lines, order),
      actorUserId
    );
  }

  async deleteLine(lineId: number | string) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    const n = toNumbers(line);
    if (n.wovenQty > 0 || n.cutQty > 0 || n.packagedQty > 0) {
      throw new ApiError(
        "Cannot cancel this line: production progress has already been recorded against it",
        400
      );
    }
    await wovenProductionRepository.deleteLineTransaction(
      Number(lineId),
      line.productionOrderId,
      (lines) => deriveWovenOrderPatch(lines, order)
    );
  }

  /* ==================== Stage progress ==================== */

  /** Records weaving output. Weaving cannot exceed the planned quantity. */
  async updateWeaving(
    lineId: number | string,
    input: { wovenQty?: number; started?: boolean; ended?: boolean; actorUserId?: number }
  ) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    await userService.assertActor(input.actorUserId);

    const res = await wovenProductionRepository.applyStageChangeTransaction(
      Number(lineId),
      (fresh) => {
        const n = toNumbers(fresh);
        const patch: Partial<WovenProductionLine> = {};

        if (!fresh.planningCompletedAt) {
          throw new ApiError("Weaving cannot start until planning is complete", 400);
        }
        if (input.wovenQty !== undefined) {
          if (input.wovenQty < 0) throw new ApiError("Woven quantity cannot be negative", 400);
          if (input.wovenQty > n.quantity) {
            throw new ApiError(
              `Woven quantity (${input.wovenQty}) cannot exceed the planned quantity (${n.quantity})`,
              400
            );
          }
          patch.wovenQty = String(input.wovenQty);
          patch.weavingStatus = input.wovenQty >= n.quantity ? "completed" : "active";
        }
        if (input.started && !fresh.weavingStartedAt) patch.weavingStartedAt = new Date();
        if (input.ended) patch.weavingEndedAt = new Date();

        patch.status = deriveWovenLineStatus({ ...fresh, ...patch } as WovenProductionLine);
        return patch;
      },
      (lines) => deriveWovenOrderPatch(lines, order)
    );
    await this.notifyIfOrderCompleted(line.productionOrderId, order.status);
    return res;
  }

  /** Records cutting. Blocked until weaving is 100% complete. */
  async updateCutting(
    lineId: number | string,
    input: { cutQty?: number; cuttingOperatorId?: number; cuttingDate?: string; actorUserId?: number }
  ) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    await userService.assertActor(input.actorUserId);


    const res = await wovenProductionRepository.applyStageChangeTransaction(
      Number(lineId),
      (fresh) => {
        const n = toNumbers(fresh);
        const patch: Partial<WovenProductionLine> = {};

        if (input.cutQty !== undefined) {
          if (!(n.quantity > 0 && n.wovenQty >= n.quantity)) {
            throw new ApiError(
              `Cutting cannot begin until weaving is complete (${n.wovenQty} of ${n.quantity} woven)`,
              400
            );
          }
          if (input.cutQty < 0) throw new ApiError("Cut quantity cannot be negative", 400);
          if (input.cutQty > n.wovenQty) {
            throw new ApiError(
              `Cut quantity (${input.cutQty}) cannot exceed the woven quantity (${n.wovenQty})`,
              400
            );
          }
          patch.cutQty = String(input.cutQty);
        }
        if (input.cuttingDate !== undefined) patch.cuttingDate = input.cuttingDate;

        patch.status = deriveWovenLineStatus({ ...fresh, ...patch } as WovenProductionLine);
        return patch;
      },
      (lines) => deriveWovenOrderPatch(lines, order)
    );
    await this.notifyIfOrderCompleted(line.productionOrderId, order.status);
    return res;
  }

  /** Records packaging. Blocked until cut quantity equals woven quantity. */
  async updatePackaging(
    lineId: number | string,
    input: {
      packagedQty?: number;
      packagedWeightKg?: number;
      packagingOperatorId?: number;
      packagingDate?: string;
      actorUserId?: number;
    }
  ) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    await userService.assertActor(input.actorUserId);


    const res = await wovenProductionRepository.applyStageChangeTransaction(
      Number(lineId),
      (fresh) => {
        const n = toNumbers(fresh);
        const patch: Partial<WovenProductionLine> = {};

        if (input.packagedQty !== undefined) {
          if (!(n.cutQty > 0 && n.cutQty >= n.wovenQty)) {
            throw new ApiError(
              `Packaging cannot begin until cutting is complete (${n.cutQty} cut of ${n.wovenQty} woven)`,
              400
            );
          }
          if (input.packagedQty < 0) throw new ApiError("Packaged quantity cannot be negative", 400);
          if (input.packagedQty > n.cutQty) {
            throw new ApiError(
              `Packaged quantity (${input.packagedQty}) cannot exceed the cut quantity (${n.cutQty})`,
              400
            );
          }
          patch.packagedQty = String(input.packagedQty);
        }
        if (input.packagedWeightKg !== undefined) {
          if (input.packagedWeightKg < 0) throw new ApiError("Packaged weight cannot be negative", 400);
          patch.packagedWeightKg = String(input.packagedWeightKg);
        }
        if (input.packagingDate !== undefined) patch.packagingDate = input.packagingDate;

        patch.status = deriveWovenLineStatus({ ...fresh, ...patch } as WovenProductionLine);
        return patch;
      },
      (lines) => deriveWovenOrderPatch(lines, order)
    );
    await this.notifyIfOrderCompleted(line.productionOrderId, order.status);
    return res;
  }

  async reconcileRemainingThreads(
    lineId: number | string,
    input: { threads: { id: number; remainingWeightKg: number }[]; actorUserId?: number }
  ) {
    const line = await this.getLineOrThrow(lineId);
    const actorUserId = await userService.assertActor(input.actorUserId);
    return wovenProductionRepository.reconcileRemainingThreadsTransaction(
      Number(lineId),
      input.threads,
      actorUserId
    );
  }

  private async notifyIfOrderCompleted(productionOrderId: number, previousStatus: string) {
    if (previousStatus === "complete") return;
    try {
      const updatedOrder = await productionOrderRepository.findById(productionOrderId);
      if (updatedOrder && updatedOrder.status === "complete") {
        mailService
          .sendProductionCompletedEmail({
            productionNumber: updatedOrder.productionNumber,
            soNumber: updatedOrder.soNumber,
            poNumber: updatedOrder.poNumber,
            companyName: updatedOrder.companyName,
            brandName: updatedOrder.brandName,
            totalQty: updatedOrder.totalQty,
            completedAt: updatedOrder.completedAt,
          })
          .catch((err) => {
            console.error("[WovenProductionService] Error sending completion email:", err);
          });
      }
    } catch (err) {
      console.error("[WovenProductionService] Failed to check completion status for email notification:", err);
    }
  }
}

export const wovenProductionService = new WovenProductionService();
