import { materialRepository } from "../repositories/material.repository";
import { ApiError, ConflictError, NotFoundError } from "../utils/ApiError";
import { Messages, Entity } from "../constants/messages";
import type { Material } from "@db/schema";

export class MaterialService {
  async getMaterials(filters?: { type?: string; includeInactive?: boolean }): Promise<Material[]> {
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
    return materialRepository.create({
      code: data.code,
      type: data.type,
      description: data.description,
      weightPerRoll: String(data.weightPerRoll),
      minStockLevel: data.minStockLevel,
      reorderQty: data.reorderQty,
    });
  }

  async updateMaterial(id: number | string, data: { type?: string; description?: string; weightPerRoll?: number; minStockLevel?: number; reorderQty?: number; isActive?: boolean }): Promise<Material> {
    const material = await materialRepository.findById(id);
    if (!material) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));
    const updated = await materialRepository.update(id, {
      ...data,
      weightPerRoll: data.weightPerRoll !== undefined ? String(data.weightPerRoll) : undefined,
    });
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));
    return updated;
  }

  async deleteMaterial(id: number | string): Promise<void> {
    const material = await materialRepository.findById(id);
    if (!material) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));
    await materialRepository.softDelete(id);
  }
}

export const materialService = new MaterialService();
