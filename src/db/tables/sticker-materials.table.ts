import { pgTable, serial, varchar, numeric, date, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Sticker roll material receipts. `totalWeight` is always server-calculated as
 * `rollQuantity × weightPerRoll`, mirroring the other purchase/material formulas.
 */
export const stickerMaterials = pgTable(
  "sticker_materials",
  {
    id: serial("id").primaryKey(),
    invoiceDate: date("invoice_date").notNull(),
    /** e.g. "4 x 6". */
    stickerSize: varchar("sticker_size", { length: 100 }).notNull(),
    materialCode: varchar("material_code", { length: 100 }).notNull(),
    rollQuantity: numeric("roll_quantity", { precision: 12, scale: 2 }).notNull(),
    weightPerRoll: numeric("weight_per_roll", { precision: 12, scale: 3 }).notNull(),
    /** Server-calculated: rollQuantity × weightPerRoll. */
    totalWeight: numeric("total_weight", { precision: 14, scale: 3 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    materialCodeIdx: index("sticker_materials_material_code_idx").on(table.materialCode),
    dateIdx: index("sticker_materials_date_idx").on(table.invoiceDate),
  })
);
