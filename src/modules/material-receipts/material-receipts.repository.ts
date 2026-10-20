import { db } from "@db/index";
import { stickerMaterials, localSheets, labelSheets } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import type {
  NewStickerMaterial,
  NewLocalSheet,
  NewLabelSheet,
} from "@db/schema";

/** Three near-identical material-receipt ledgers grouped in one file. */

export class StickerMaterialRepository {
  findAll() {
    return db.select().from(stickerMaterials).orderBy(desc(stickerMaterials.invoiceDate), desc(stickerMaterials.id));
  }
  async findById(id: number) {
    const [row] = await db.select().from(stickerMaterials).where(eq(stickerMaterials.id, id));
    return row;
  }
  async create(data: NewStickerMaterial) {
    const [row] = await db.insert(stickerMaterials).values(data).returning();
    return row;
  }
  async update(id: number, data: Partial<NewStickerMaterial>) {
    const [row] = await db
      .update(stickerMaterials)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stickerMaterials.id, id))
      .returning();
    return row;
  }
  async remove(id: number) {
    const [row] = await db.delete(stickerMaterials).where(eq(stickerMaterials.id, id)).returning();
    return row;
  }
}

export class LocalSheetRepository {
  findAll() {
    return db.select().from(localSheets).orderBy(desc(localSheets.date), desc(localSheets.id));
  }
  async findById(id: number) {
    const [row] = await db.select().from(localSheets).where(eq(localSheets.id, id));
    return row;
  }
  async create(data: NewLocalSheet) {
    const [row] = await db.insert(localSheets).values(data).returning();
    return row;
  }
  async update(id: number, data: Partial<NewLocalSheet>) {
    const [row] = await db
      .update(localSheets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(localSheets.id, id))
      .returning();
    return row;
  }
  async remove(id: number) {
    const [row] = await db.delete(localSheets).where(eq(localSheets.id, id)).returning();
    return row;
  }
}

export class LabelSheetRepository {
  findAll() {
    return db.select().from(labelSheets).orderBy(desc(labelSheets.date), desc(labelSheets.id));
  }
  async findById(id: number) {
    const [row] = await db.select().from(labelSheets).where(eq(labelSheets.id, id));
    return row;
  }
  async create(data: NewLabelSheet) {
    const [row] = await db.insert(labelSheets).values(data).returning();
    return row;
  }
  async update(id: number, data: Partial<NewLabelSheet>) {
    const [row] = await db
      .update(labelSheets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(labelSheets.id, id))
      .returning();
    return row;
  }
  async remove(id: number) {
    const [row] = await db.delete(labelSheets).where(eq(labelSheets.id, id)).returning();
    return row;
  }
}

export const stickerMaterialRepository = new StickerMaterialRepository();
export const localSheetRepository = new LocalSheetRepository();
export const labelSheetRepository = new LabelSheetRepository();
