import { db } from "@db/index";
import { materials } from "@db/schema";
import { eq, asc, and } from "drizzle-orm";
import { NotFoundError } from "@api/utils";
import type { Material } from "@db/schema";

export class MaterialRepository {
  async findAll(filters?: { type?: string; includeInactive?: boolean }) {
    const conditions = [];
    if (filters?.type) conditions.push(eq(materials.type, filters.type));
    if (!filters?.includeInactive) conditions.push(eq(materials.isActive, true));
    return db
      .select()
      .from(materials)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(materials.code));
  }

  async findByCode(code: string) {
    const [material] = await db.select().from(materials).where(eq(materials.code, code));
    return material;
  }

  async findById(id: number | string) {
    const [material] = await db.select().from(materials).where(eq(materials.id, Number(id)));
    return material;
  }

  async create(data: { code: string; type: string; description?: string; weightPerRoll: string; minStockLevel?: number; reorderQty?: number }) {
    const [material] = await db.insert(materials).values(data).returning();
    return material;
  }

  async update(id: number | string, data: { type?: string; description?: string; weightPerRoll?: string; minStockLevel?: number; reorderQty?: number; isActive?: boolean }) {
    const [material] = await db
      .update(materials)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(materials.id, Number(id)))
      .returning();
    return material;
  }

  async softDelete(id: number | string) {
    const [material] = await db
      .update(materials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(materials.id, Number(id)))
      .returning();
    return material;
  }
}

export const materialRepository = new MaterialRepository();
