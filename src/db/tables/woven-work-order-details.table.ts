import { pgTable, serial, integer, varchar, numeric, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { workOrders } from "./work-orders.table";

/**
 * The woven-only half of a sales order, kept in its own 1:1 table rather than as nullable
 * columns on `work_orders`.
 *
 * Company / Brand / PO / SO / Quantity are identical across both product types and stay on
 * `work_orders`; only the loom specification lives here. Splitting it this way means the
 * printed workflow's table is untouched (no new nullable columns to reason about) and the
 * woven fields can be `notNull` — genuinely required — instead of nullable-by-necessity.
 *
 * `workOrderId` is unique: one sales order carries at most one woven specification.
 */
export const wovenWorkOrderDetails = pgTable(
  "woven_work_order_details",
  {
    id: serial("id").primaryKey(),
    workOrderId: integer("work_order_id")
      .notNull()
      .unique()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    /** Customer-facing design identifier, e.g. "Guess 13R". Unique across the facility. */
    designCode: varchar("design_code", { length: 100 }).notNull().unique(),
    /** Weft picks per unit, e.g. 853. */
    pick: integer("pick").notNull(),
    /** Design repeat length, e.g. 60. */
    repeat: numeric("repeat", { precision: 12, scale: 2 }).notNull(),
    /** Warp density, e.g. 560. */
    density: integer("density").notNull(),
    /** Extra allowance added on top of the ordered quantity, e.g. 150. */
    extra: numeric("extra", { precision: 12, scale: 2 }).default("0").notNull(),
    /** Size labels woven on this order, e.g. ["10", "12", "XL", "34/34"]. */
    sizeLabels: jsonb("size_labels").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    workOrderIdx: index("woven_wo_details_work_order_idx").on(table.workOrderId),
    designCodeIdx: index("woven_wo_details_design_code_idx").on(table.designCode),
  })
);
