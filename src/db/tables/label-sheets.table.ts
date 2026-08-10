import { pgTable, serial, varchar, numeric, date, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Label sheet material receipts. `totalWeight` is always server-calculated as
 * `sheetQuantity × weightPerSheet`.
 */
export const labelSheets = pgTable(
  "label_sheets",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    materialCode: varchar("material_code", { length: 100 }).notNull(),
    sheetQuantity: numeric("sheet_quantity", { precision: 12, scale: 2 }).notNull(),
    weightPerSheet: numeric("weight_per_sheet", { precision: 12, scale: 3 }).notNull(),
    /** Server-calculated: sheetQuantity × weightPerSheet. */
    totalWeight: numeric("total_weight", { precision: 14, scale: 3 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    materialCodeIdx: index("label_sheets_material_code_idx").on(table.materialCode),
    dateIdx: index("label_sheets_date_idx").on(table.date),
  })
);
