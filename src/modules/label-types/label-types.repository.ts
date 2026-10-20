import { db } from "@db/index";
import { labelTypes } from "@db/schema";
import { eq, and, or, asc } from "drizzle-orm";
import type { LabelType, NewLabelType } from "@db/schema";

export class LabelTypesRepository {
  async findAll(filters?: { category?: string; activeOnly?: boolean }) {
    const conditions = [];
    if (filters?.category) {
      conditions.push(eq(labelTypes.category, filters.category as "woven" | "printed"));
    }
    if (filters?.activeOnly !== false) {
      // Default to activeOnly = true unless explicitly set to false
      if (filters?.activeOnly === undefined || filters.activeOnly === true) {
        conditions.push(eq(labelTypes.isActive, true));
      }
    }
    return db
      .select()
      .from(labelTypes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(labelTypes.name));
  }

  async findById(id: number | string) {
    const [labelType] = await db
      .select()
      .from(labelTypes)
      .where(eq(labelTypes.id, Number(id)));
    return labelType;
  }

  async findByNameAndCategory(name: string, category: string) {
    const [labelType] = await db
      .select()
      .from(labelTypes)
      .where(
        and(
          eq(labelTypes.name, name),
          eq(labelTypes.category, category as "woven" | "printed")
        )
      );
    return labelType;
  }

  async create(data: NewLabelType) {
    const [labelType] = await db.insert(labelTypes).values(data).returning();
    return labelType;
  }

  async update(id: number | string, data: Partial<NewLabelType>) {
    const [labelType] = await db
      .update(labelTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(labelTypes.id, Number(id)))
      .returning();
    return labelType;
  }

  async delete(id: number | string) {
    const [labelType] = await db
      .delete(labelTypes)
      .where(eq(labelTypes.id, Number(id)))
      .returning();
    return labelType;
  }
}

export const labelTypesRepository = new LabelTypesRepository();