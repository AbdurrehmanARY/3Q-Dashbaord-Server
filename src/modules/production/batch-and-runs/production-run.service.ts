import { productionRunRepository } from "./production-run.repository";
import { BadRequestError, NotFoundError } from "@shared/errors/ApiError";
import { Messages, Entity } from "@shared/constants/messages";
import type { CreateProductionRunDTO } from "./production-run.schema";

export class ProductionRunService {
  /**
   * Append a production pass. Never updates a prior run — every call is one INSERT, so the
   * full production history is preserved. Duplicate-submit protection: an identical
   * `idempotencyKey` returns the existing run, and an identical sale-order/machine/operator/
   * quantity fingerprint within 5 seconds is rejected as an accidental double-submit.
   */
  async logProductionRun(saleOrderId: number, data: CreateProductionRunDTO) {
    const workOrder = await productionRunRepository.getWorkOrder(saleOrderId);
    if (!workOrder) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));

    if (data.idempotencyKey) {
      const existing = await productionRunRepository.findByIdempotencyKey(data.idempotencyKey);
      if (existing) return existing; // idempotent replay — same key, same run
    }

    const quantityProduced = String(data.quantityProduced);

    const recentDuplicate = await productionRunRepository.findRecentDuplicate({
      saleOrderId,
      machineId: data.machineId ?? null,
      operatorId: data.operatorId ?? null,
      quantityProduced,
    });
    if (recentDuplicate) {
      throw new BadRequestError(
        "An identical production run was just logged. If this is intentional, resubmit in a few seconds."
      );
    }

    return productionRunRepository.create({
      saleOrderId,
      productId: data.productId,
      machineId: data.machineId,
      operatorId: data.operatorId,
      quantityProduced,
      runReason: data.runReason,
      notes: data.notes,
      idempotencyKey: data.idempotencyKey,
      createdBy: data.createdBy,
    });
  }

  /**
   * Production Summary for a sale order: ordered vs produced vs remaining, plus the full
   * append-only history and per-machine / per-operator breakdowns. All derived on query.
   */
  async getProductionSummary(saleOrderId: number) {
    const workOrder = await productionRunRepository.getWorkOrder(saleOrderId);
    if (!workOrder) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));

    const [totalProduced, history, machineHistory, operatorHistory] = await Promise.all([
      productionRunRepository.getTotalProduced(saleOrderId),
      productionRunRepository.findBySaleOrderId(saleOrderId),
      productionRunRepository.getMachineBreakdown(saleOrderId),
      productionRunRepository.getOperatorBreakdown(saleOrderId),
    ]);

    const orderedQuantity = Number(workOrder.totalQty);
    const remainingQuantity = orderedQuantity - totalProduced;

    return {
      saleOrderId,
      soNumber: workOrder.soNumber,
      orderedQuantity,
      totalProduced,
      remainingQuantity,
      history,
      machineHistory,
      operatorHistory,
    };
  }
}

export const productionRunService = new ProductionRunService();
