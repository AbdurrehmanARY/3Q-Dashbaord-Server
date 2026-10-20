import { materialRepository } from "./material.repository";
import { inventoryRollRepository } from "./inventory-roll.repository";
import { ApiError, ConflictError, NotFoundError } from "@shared/errors/ApiError";
import { Messages, Entity } from "@shared/constants/messages";
import type { Material } from "@db/schema";

export class MaterialService {
  async getMaterials(filters?: { type?: string; includeInactive?: boolean }): Promise<Material[]> {
    await inventoryRollRepository.syncMaterialStockLedgers();
    return materialRepository.findAll(filters);
  }

  async getMaterialByCode(code: string): Promise<Material> {
    const material = await materialRepository.findByCode(code);
    if (!material) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));
    return material;
  }

  async getMaterialById(id: number | string): Promise<Material> {
    const material = await materialRepository.findById(id);
    if (!material) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));
    return material;
  }

  async createMaterial(data: { code: string; type: string; description?: string; weightPerRoll: number; minStockLevel?: number; reorderQty?: number }): Promise<Material> {
    const existing = await materialRepository.findByCode(data.code);
    if (existing) throw new ConflictError(Messages.alreadyExists(Entity.MATERIAL));
    const created = await materialRepository.create({
      code: data.code,
      type: data.type,
      description: data.description,
      weightPerRoll: String(data.weightPerRoll),
      minStockLevel: data.minStockLevel,
      reorderQty: data.reorderQty,
    });

    // Auto-create initial 0-stock ledger in inventory_rolls so material code and stock sync instantly
    const weight = data.weightPerRoll;
    const rollPerKg = weight > 0 ? String((1 / weight).toFixed(4)) : "0";
    try {
      await inventoryRollRepository.createWithHistory({
        materialCode: data.code,
        openingStock: "0",
        receivedRolls: "0",
        issuedRolls: "0",
        balanceRolls: "0",
        rollPerKg,
      });
    } catch {
      // Ignore if ledger already created concurrently
    }

    return created;
  }

  async updateMaterial(id: number | string, data: { type?: string; description?: string; weightPerRoll?: number; minStockLevel?: number; reorderQty?: number; isActive?: boolean }): Promise<Material> {
    const material = await materialRepository.findById(id);
    if (!material) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));
    const updated = await materialRepository.update(id, {
      ...data,
      weightPerRoll: data.weightPerRoll !== undefined ? String(data.weightPerRoll) : undefined,
    });
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));

    if (data.weightPerRoll !== undefined && data.weightPerRoll > 0) {
      const rollPerKg = String((1 / data.weightPerRoll).toFixed(4));
      const ledger = await inventoryRollRepository.findByMaterialCode(updated.code);
      if (ledger) {
        await inventoryRollRepository.updateWithHistory(updated.code, { rollPerKg });
      }
    }

    return updated;
  }

  async deleteMaterial(id: number | string): Promise<void> {
    const material = await materialRepository.findById(id);
    if (!material) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));
    await materialRepository.softDelete(id);
  }
}

export const materialService = new MaterialService();
