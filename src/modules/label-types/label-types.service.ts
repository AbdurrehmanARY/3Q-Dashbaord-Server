import { labelTypesRepository } from "./label-types.repository";
import { NotFoundError, ConflictError } from "@shared/errors/ApiError";
import { Messages, Entity } from "@shared/constants/messages";
import type { CreateLabelTypeDTO, UpdateLabelTypeDTO } from "./label-types.schema";

export class LabelTypesService {
  getAll(filters?: { category?: "woven" | "printed"; activeOnly?: boolean }) {
    return labelTypesRepository.findAll(filters);
  }

  async getById(id: number | string) {
    const labelType = await labelTypesRepository.findById(id);
    if (!labelType) throw new NotFoundError(Messages.notFound(Entity.LABEL_TYPE));
    return labelType;
  }

  async create(data: CreateLabelTypeDTO) {
    // Check if a label type with the same name and category already exists
    const existing = await labelTypesRepository.findByNameAndCategory(data.name, data.category);
    if (existing) {
      throw new ConflictError(Messages.alreadyExists(Entity.LABEL_TYPE));
    }
    return labelTypesRepository.create({
      name: data.name,
      category: data.category,
      isActive: true, // Default to active
    });
  }

  async update(id: number | string, data: UpdateLabelTypeDTO) {
    // Check if name change creates a conflict
    if (data.name !== undefined) {
      const existing = await labelTypesRepository.findByNameAndCategory(
        data.name,
        data.category ?? (await this.getById(id)).category
      );
      if (existing && existing.id !== Number(id)) {
        throw new ConflictError(Messages.alreadyExists(Entity.LABEL_TYPE));
      }
    }
    return labelTypesRepository.update(id, data);
  }

  async delete(id: number | string) {
    const existing = await this.getById(id);
    // Note: In a full implementation, we would check if the label type is referenced
    // by production_order_lines or production_batches here and throw an error if so.
    return labelTypesRepository.delete(id);
  }
}

export const labelTypesService = new LabelTypesService();