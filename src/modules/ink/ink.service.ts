import { inkRepository } from "./ink.repository";
import { operatorRepository } from "@modules/operators/operator.repository";
import { ApiError, NotFoundError } from "@shared/errors/ApiError";
import { Messages, Entity } from "@shared/constants/messages";
import type {
  CreateInkPurchaseDTO,
  UpdateInkPurchaseDTO,
  CreateInkConsumptionDTO,
} from "./ink.schema";

/** Decimal columns take strings through Drizzle. */
const dec = (n: number) => String(n);

export class InkService {
  /* ---------------- Purchases ---------------- */
  listPurchases() {
    return inkRepository.listPurchases();
  }

  createPurchase(data: CreateInkPurchaseDTO) {
    // totalWeight is server-calculated — never trusted from the client.
    const totalWeight = data.quantity * data.weightPerQty;
    return inkRepository.createPurchase({
      reportDate: data.reportDate,
      materialCode: data.materialCode,
      vendor: data.vendor,
      invoiceNumber: data.invoiceNumber ?? null,
      quantity: dec(data.quantity),
      weightPerQty: dec(data.weightPerQty),
      totalWeight: dec(totalWeight),
    });
  }

  async updatePurchase(id: number, data: UpdateInkPurchaseDTO) {
    const existing = await inkRepository.findPurchaseById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.INK_PURCHASE));
    // Re-derive totalWeight from the merged (existing + patch) figures.
    const quantity = data.quantity ?? Number(existing.quantity);
    const weightPerQty = data.weightPerQty ?? Number(existing.weightPerQty);
    return inkRepository.updatePurchase(id, {
      ...(data.reportDate !== undefined && { reportDate: data.reportDate }),
      ...(data.materialCode !== undefined && { materialCode: data.materialCode }),
      ...(data.vendor !== undefined && { vendor: data.vendor }),
      ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber || null }),
      quantity: dec(quantity),
      weightPerQty: dec(weightPerQty),
      totalWeight: dec(quantity * weightPerQty),
    });
  }

  async removePurchase(id: number) {
    const existing = await inkRepository.findPurchaseById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.INK_PURCHASE));
    await inkRepository.removePurchase(id);
  }

  /* ---------------- Stock ---------------- */
  async stock() {
    const rows = await inkRepository.stockLevels();
    return rows.map((r) => {
      const purchasedQty = Number(r.purchasedQty);
      const purchasedWeight = Number(r.purchasedWeight);
      const consumedQty = Number(r.consumedQty);
      const consumedWeight = Number(r.consumedWeight);
      return {
        materialCode: r.materialCode,
        purchasedQty,
        purchasedWeight,
        consumedQty,
        consumedWeight,
        balanceQty: purchasedQty - consumedQty,
        balanceWeight: purchasedWeight - consumedWeight,
      };
    });
  }

  /* ---------------- Consumptions ---------------- */
  listConsumptions() {
    return inkRepository.listConsumptions();
  }

  consumptionByOperator() {
    return inkRepository.consumptionByOperator();
  }

  async createConsumption(data: CreateInkConsumptionDTO) {
    // Guard: cannot consume more weight than the material currently has in stock.
    const balance = await inkRepository.balanceWeight(data.materialCode);
    if (data.weight > balance) {
      throw new ApiError(
        `Cannot consume ${data.weight} kg of ${data.materialCode}: only ${balance} kg in stock`,
        400
      );
    }

    // Snapshot the operator name so history survives a later rename; look it up when the
    // client passed only an id.
    let operatorName = data.operatorName?.trim() || null;
    if (data.operatorId != null && !operatorName) {
      const op = await operatorRepository.findById(data.operatorId);
      operatorName = op?.name ?? null;
    }

    return inkRepository.createConsumption({
      materialCode: data.materialCode,
      qtyAssigned: dec(data.qtyAssigned),
      operatorId: data.operatorId ?? null,
      operatorName,
      weight: dec(data.weight),
      note: data.note?.trim() || null,
    });
  }

  async removeConsumption(id: number) {
    const removed = await inkRepository.removeConsumption(id);
    if (!removed) throw new NotFoundError(Messages.notFound(Entity.INK_CONSUMPTION));
  }
}

export const inkService = new InkService();
