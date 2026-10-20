import { pgTable, serial, varchar, decimal, timestamp, unique } from "drizzle-orm/pg-core";
import { materials } from "./materials.table";

export const inventoryRolls = pgTable(
  "inventory_rolls",
  {
    id: serial("id").primaryKey(),
    materialCode: varchar("material_code", { length: 100 })
      .notNull()
      .unique()
      .references(() => materials.code),
    openingStock: decimal("opening_stock", { precision: 12, scale: 2 }).default("0").notNull(),
    receivedRolls: decimal("received_rolls", { precision: 12, scale: 2 }).default("0").notNull(),
    issuedRolls: decimal("issued_rolls", { precision: 12, scale: 2 }).default("0").notNull(),
    balanceRolls: decimal("balance_rolls", { precision: 12, scale: 2 }).default("0").notNull(),
    /** Rolls per kilogram for this material — user input. Drives the computed per-SKU balance. */
    rollPerKg: decimal("roll_per_kg", { precision: 12, scale: 4 }).default("0").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    materialCodeIdx: unique("inventory_rolls_material_code_idx").on(table.materialCode),
  })
);
