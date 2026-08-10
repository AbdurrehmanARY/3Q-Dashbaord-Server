import { pgTable, serial, varchar, numeric, date, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Local sheet material receipts. `totalWeight` is always server-calculated as
 * `packetQuantity × packetWeight`.
 */
export const localSheets = pgTable(
  "local_sheets",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    /** e.g. "20 x 30". */
    materialCode: varchar("material_code", { length: 100 }).notNull(),
    packetQuantity: numeric("packet_quantity", { precision: 12, scale: 2 }).notNull(),
    packetWeight: numeric("packet_weight", { precision: 12, scale: 3 }).notNull(),
    /** Server-calculated: packetQuantity × packetWeight. */
    totalWeight: numeric("total_weight", { precision: 14, scale: 3 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    materialCodeIdx: index("local_sheets_material_code_idx").on(table.materialCode),
    dateIdx: index("local_sheets_date_idx").on(table.date),
  })
);
