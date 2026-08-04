import { pgTable, serial, integer, varchar, text, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { workOrders } from "./work-orders.table";
import { users } from "./users.table";

/**
 * Three automatic states, derived from roll progress (never set by hand):
 *   planned    — created/planned, no production started yet
 *   production — any printing/cutting/packaging has begun
 *   complete   — every label type fully packaged
 */
export const productionOrderStatusEnum = pgEnum("production_order_status", [
  "planned",
  "production",
  "complete",
]);

/**
 * A production run raised by Office Staff against a submitted (approved) sales order.
 *
 * The sales order is the link between the two sides of the workflow: a production
 * order carries no company/brand/customer of its own — those are always derived via
 * `work_orders.brandId -> brands.companyId -> companies`.
 *
 * `workOrderId` is unique: one sales order produces exactly one production order, so
 * `totalQty` (copied from the sales order at creation) is the single figure that the
 * label-type breakdown must sum to.
 */
export const productionOrders = pgTable(
  "production_orders",
  {
    id: serial("id").primaryKey(),
    productionNumber: varchar("production_number", { length: 100 }).notNull().unique(),
    workOrderId: integer("work_order_id")
      .notNull()
      .unique()
      .references(() => workOrders.id, { onDelete: "restrict" }),
    totalQty: integer("total_qty").notNull(),
    status: productionOrderStatusEnum("status").default("planned").notNull(),
    notes: text("notes"),
    createdByUserId: integer("created_by_user_id").references(() => users.id),
    plannedAt: timestamp("planned_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    workOrderIdx: index("production_orders_work_order_idx").on(table.workOrderId),
    statusIdx: index("production_orders_status_idx").on(table.status),
  })
);
