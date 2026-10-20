import { pgTable, serial, varchar, date, decimal, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Ink purchase / receipt log. Ink is tracked by a free-text `materialCode` (it is its own
 * small master, not one of the fabric `materials`), so there is no FK here.
 *
 * `totalWeight` is **always server-calculated** (`quantity × weightPerQty`) — the client
 * never supplies it. Stock is derived on read as
 * `Σ totalWeight (purchases) − Σ weight (consumptions)` per material code.
 */
export const inkPurchases = pgTable(
  "ink_purchases",
  {
    id: serial("id").primaryKey(),
    reportDate: date("report_date").notNull(),
    materialCode: varchar("material_code", { length: 100 }).notNull(),
    vendor: varchar("vendor", { length: 200 }).notNull(),
    invoiceNumber: varchar("invoice_number", { length: 100 }),
    /** Units purchased (cans / tins / kg-lots — whatever the facility counts ink in). */
    quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
    /** Weight per unit. */
    weightPerQty: decimal("weight_per_qty", { precision: 12, scale: 3 }).notNull(),
    /** Server-calculated `quantity × weightPerQty`. */
    totalWeight: decimal("total_weight", { precision: 14, scale: 3 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    materialCodeIdx: index("ink_purchases_material_code_idx").on(table.materialCode),
  })
);
