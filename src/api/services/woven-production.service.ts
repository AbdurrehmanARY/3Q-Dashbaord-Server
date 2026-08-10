import { wovenProductionRepository, type ThreadPlanInput } from "../repositories/woven-production.repository";
import { productionOrderRepository } from "../repositories/production-order.repository";
import { machineRepository } from "../repositories/machine.repository";
import { operatorRepository } from "../repositories/operator.repository";
import { userService } from "./user.service";
import { mailService } from "./mail.service";
import { ApiError, NotFoundError } from "../utils/ApiError";
import { Messages, Entity } from "../constants/messages";
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
  quantity: number;
  weavingMachineId: number;
  weavingOperatorId: number;
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
    const machineName = (id: number | null) => machines.find((m) => m.id === id)?.name ?? null;
    const operatorName = (id: number | null) => operators.find((o) => o.id === id)?.name ?? null;

    const detailed = await Promise.all(
      lines.map(async (line) => {
        const n = toNumbers(line);
        const threads = await wovenProductionRepository.findThreadPlan(line.id);
        return {
          id: line.id,
          quantity: n.quantity,
          status: line.status,
          planning: {
            totalThreadWeightKg: n.totalThreadWeightKg,
            completedAt: line.planningCompletedAt,
            threadCount: threads.length,
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
            machineId: line.weavingMachineId,
            machineName: machineName(line.weavingMachineId),
            operatorId: line.weavingOperatorId,
            operatorName: operatorName(line.weavingOperatorId),
            wovenQty: n.wovenQty,
            status: line.weavingStatus,
            startedAt: line.weavingStartedAt,
            endedAt: line.weavingEndedAt,
            progressPct: n.quantity > 0 ? Math.round((n.wovenQty / n.quantity) * 10000) / 100 : 0,
            isComplete: n.quantity > 0 && n.wovenQty >= n.quantity,
          },
          cutting: {
            operatorId: line.cuttingOperatorId,
            operatorName: operatorName(line.cuttingOperatorId),
            cutQty: n.cutQty,
            cuttingDate: line.cuttingDate,
            /** Cutting cannot begin until weaving is 100% complete. */
            canStart: canStartCutting(line),
            isComplete: n.cutQty > 0 && n.cutQty >= n.wovenQty,
          },
          packaging: {
            operatorId: line.packagingOperatorId,
            operatorName: operatorName(line.packagingOperatorId),
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

    const machine = await machineRepository.findById(input.weavingMachineId);
    if (!machine) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    const operator = await operatorRepository.findById(input.weavingOperatorId);
    if (!operator) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));

    if (lineId) {
      await this.getLineOrThrow(lineId);
    }

    return wovenProductionRepository.savePlanTransaction(
      Number(productionOrderId),
      lineId,
      {
        quantity: String(input.quantity),
        weavingMachineId: input.weavingMachineId,
        weavingOperatorId: input.weavingOperatorId,
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

    if (input.cuttingOperatorId != null && !(await operatorRepository.findById(input.cuttingOperatorId))) {
      throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    }

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
        if (input.cuttingOperatorId !== undefined) patch.cuttingOperatorId = input.cuttingOperatorId;
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

    if (input.packagingOperatorId != null && !(await operatorRepository.findById(input.packagingOperatorId))) {
      throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    }

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
        if (input.packagingOperatorId !== undefined) patch.packagingOperatorId = input.packagingOperatorId;
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
