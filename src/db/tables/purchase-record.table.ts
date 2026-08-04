import { pgTable, serial, date, varchar, integer, decimal, timestamp, index } from "drizzle-orm/pg-core";
import { materials } from "./materials.table";

export const purchaseRecords = pgTable(
  "purchase_records",
  {
    id: serial("id").primaryKey(),
    reportDate: date("report_date").notNull(),
    materialCode: varchar("material_code", { length: 100 }).notNull().references(() => materials.code),
    materialType: varchar("material_type", { length: 100 }),
    itemName: varchar("item_name", { length: 255 }),
    invoiceNumber: varchar("invoice_number", { length: 255 }),
    vendor: varchar("vendor", { length: 255 }).notNull(),
    cartonQty: integer("carton_qty").notNull(),
    rollsPerCarton: integer("rolls_per_carton").notNull(),
    totalRoll: decimal("total_roll", { precision: 12, scale: 2 }),
    rollLength: decimal("roll_length", { precision: 10, scale: 2 }).notNull(),
    netWeight: decimal("net_weight", { precision: 10, scale: 2 }).notNull(),
    efs: varchar("efs", { length: 100 }),
    /** = totalRoll * (rollLength / 200). Always server-calculated — see purchase-formula.ts. */
    totalRollPer200m: decimal("total_roll_per_200m", { precision: 12, scale: 2 }),
    /** = (netWeight * 200) / (totalRoll * rollLength). Always server-calculated. */
    invoiceWeight: decimal("invoice_weight", { precision: 10, scale: 2 }),
    /** Copied from `materials.weightPerRoll` for the purchase's material. Never user-entered. */
    localWeight: decimal("local_weight", { precision: 10, scale: 4 }),
    gdNumber: varchar("gd_number", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    materialCodeIdx: index("purchase_records_material_code_idx").on(table.materialCode),
  })
);
