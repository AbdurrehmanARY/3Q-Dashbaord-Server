import { inventoryRepository, type StockAdjustment } from "../repositories/inventory.repository";
import { materialRepository } from "../repositories/material.repository";
import { NotFoundError } from "../utils/ApiError";
import { Messages, Entity } from "../constants/messages";
import { calculateTotalRollPer200m, calculateInvoiceWeight } from "../utils/purchase-formula";
import type { PurchaseRecord, Material } from "@db/schema";

interface DerivedInputs {
  cartonQty: number;
  rollsPerCarton: number;
  rollLength: number;
  netWeight: number;
  /** Weight per roll (kg) entered on the purchase; falls back to the material's. */
  weightPerRoll?: number;
}

/**
 * `totalRoll`, `totalRollPer200m`, `invoiceWeight` are always calculated here — never
 * trusted from the client. `localWeight` is the weight per roll: taken from the purchase
 * input when given, else the material's `weightPerRoll`. Total weight is derived on read as
 * `totalRoll × localWeight`, so it is never stored redundantly.
 */
function calculateDerivedFields(inputs: DerivedInputs, material: Material) {
  const totalRoll = inputs.cartonQty * inputs.rollsPerCarton;
  const weightPerRoll = inputs.weightPerRoll ?? Number(material.weightPerRoll);
  return {
    totalRoll: String(totalRoll),
    totalRollPer200m: String(calculateTotalRollPer200m(totalRoll, inputs.rollLength)),
    invoiceWeight: String(calculateInvoiceWeight(inputs.netWeight, totalRoll, inputs.rollLength)),
    localWeight: String(weightPerRoll),
  };
}

/**
 * Purchase records are plain CRUD — there is no approval workflow. Each purchase
 * automatically credits its rolls into inventory on create, reconciles the delta on
 * update, and reverses them on delete, all transactionally.
 */
export class InventoryService {
  async createPurchase(data: {
    reportDate: string;
    materialCode: string;
    invoiceNumber: string;
    vendor: string;
    cartonQty: number;
    rollsPerCarton: number;
    rollLength: number;
    netWeight: number;
    weightPerRoll?: number;
    efs?: string;
    gdNumber?: string;
  }): Promise<PurchaseRecord> {
    const material = await materialRepository.findByCode(data.materialCode);
    if (!material) throw new NotFoundError(`Material with code '${data.materialCode}' not found`);

    const derived = calculateDerivedFields(data, material);
    const totalRoll = data.cartonQty * data.rollsPerCarton;

    return inventoryRepository.createPurchaseWithStock(
      {
        reportDate: data.reportDate,
        materialCode: data.materialCode,
        invoiceNumber: data.invoiceNumber,
        vendor: data.vendor,
        cartonQty: data.cartonQty,
        rollsPerCarton: data.rollsPerCarton,
        efs: data.efs,
        gdNumber: data.gdNumber,
        materialType: material.type,
        itemName: material.description ?? material.type,
        rollLength: String(data.rollLength),
        netWeight: String(data.netWeight),
        ...derived,
      },
      { materialCode: data.materialCode, rolls: totalRoll }
    );
  }

  async getPurchases(filters?: { startDate?: string; endDate?: string; vendor?: string; materialCode?: string }) {
    return inventoryRepository.findAllPurchases(filters);
  }

  async getPurchase(id: number | string) {
    const report = await inventoryRepository.findPurchaseById(id);
    if (!report) throw new NotFoundError(Messages.notFound(Entity.PURCHASE_RECORD));
    return report;
  }

  async updatePurchase(id: number | string, data: {
    reportDate?: string;
    materialCode?: string;
    invoiceNumber?: string;
    vendor?: string;
    cartonQty?: number;
    rollsPerCarton?: number;
    rollLength?: number;
    netWeight?: number;
    weightPerRoll?: number;
    efs?: string;
    gdNumber?: string;
  }) {
    const existing = await inventoryRepository.findPurchaseById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.PURCHASE_RECORD));

    // weightPerRoll is not a column — it feeds calculateDerivedFields (→ localWeight).
    const { materialCode, rollLength, netWeight, weightPerRoll, ...rest } = data;
    const updateData: Record<string, unknown> = { ...rest };

    const newMaterialCode = materialCode ?? existing.materialCode;
    const material = await materialRepository.findByCode(newMaterialCode);
    if (!material) throw new NotFoundError(`Material with code '${newMaterialCode}' not found`);

    if (materialCode) {
      updateData.materialCode = materialCode;
      updateData.materialType = material.type;
      updateData.itemName = material.description ?? material.type;
    }
    if (rollLength !== undefined) updateData.rollLength = String(rollLength);
    if (netWeight !== undefined) updateData.netWeight = String(netWeight);

    // Recompute all four derived fields from the merged inputs.
    const derived = calculateDerivedFields(
      {
        cartonQty: data.cartonQty ?? existing.cartonQty,
        rollsPerCarton: data.rollsPerCarton ?? existing.rollsPerCarton,
        rollLength: rollLength ?? Number(existing.rollLength),
        netWeight: netWeight ?? Number(existing.netWeight),
        weightPerRoll: weightPerRoll ?? (existing.localWeight != null ? Number(existing.localWeight) : undefined),
      },
      material
    );
    Object.assign(updateData, derived);

    // Reconcile inventory: reverse the old rolls, credit the new. If the material changed,
    // that means fully debiting the old material and crediting the new one.
    const oldRolls = existing.cartonQty * existing.rollsPerCarton;
    const newRolls = (data.cartonQty ?? existing.cartonQty) * (data.rollsPerCarton ?? existing.rollsPerCarton);
    const adjustments: StockAdjustment[] =
      newMaterialCode === existing.materialCode
        ? [{ materialCode: existing.materialCode, rolls: newRolls - oldRolls }]
        : [
            { materialCode: existing.materialCode, rolls: -oldRolls },
            { materialCode: newMaterialCode, rolls: newRolls },
          ];

    return inventoryRepository.updatePurchaseWithStock(id, updateData, adjustments);
  }

  async deletePurchase(id: number | string): Promise<void> {
    const existing = await inventoryRepository.findPurchaseById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.PURCHASE_RECORD));
    const rolls = existing.cartonQty * existing.rollsPerCarton;
    await inventoryRepository.deletePurchaseWithStock(id, { materialCode: existing.materialCode, rolls: -rolls });
  }

  async getStock(filters?: { materialCode?: string; type?: string }) {
    return inventoryRepository.findInventoryRolls(filters);
  }
}

export const inventoryService = new InventoryService();
