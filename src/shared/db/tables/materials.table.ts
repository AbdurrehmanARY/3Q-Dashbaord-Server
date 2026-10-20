import { pgTable, serial, varchar, text, decimal, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";

export const materials = pgTable(
  "materials",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 100 }).notNull().unique(),
    type: varchar("type", { length: 100 }).notNull(),
    description: text("description"),
    weightPerRoll: decimal("weight_per_roll", { precision: 10, scale: 4 }).notNull(),
    minStockLevel: integer("min_stock_level").default(10).notNull(),
    reorderQty: integer("reorder_qty").default(50).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: unique("materials_code_idx").on(table.code),
  })
);
