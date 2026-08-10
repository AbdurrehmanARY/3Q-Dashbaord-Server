import { pgTable, uuid, integer, varchar, decimal, text, timestamp, index } from "drizzle-orm/pg-core";
import { workOrders } from "./work-orders.table";
import { machines } from "./machines.table";
import { operators } from "./operators.table";
import { users } from "./users.table";
import { productionRunReasonEnum } from "./production-run-reason.enum";

/**
 * Append-only production ledger. Every batch execution against a sales order — the first
 * pass and every corrective pass (shortfall, recut, rework, …) — is one INSERT here and is
 * never updated or deleted. Derived figures like Total Produced and Remaining Quantity are
 * computed on query as `SUM(quantity_produced)`, so the full history is always preserved.
 *
 * Keyed on `saleOrderId` (`work_orders.id`) so it spans a whole sales order rather than a
 * single production-order line; it complements the existing production_orders workflow
 * rather than replacing its stage tracking.
 */
export const productionRuns = pgTable(
  "production_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saleOrderId: integer("sale_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    /** Label type / product specification this pass produced. */
    productId: varchar("product_id", { length: 150 }),
    machineId: integer("machine_id").references(() => machines.id),
    operatorId: integer("operator_id").references(() => operators.id),
    quantityProduced: decimal("quantity_produced", { precision: 12, scale: 2 }).notNull(),
    runReason: productionRunReasonEnum("run_reason").default("initial").notNull(),
    notes: text("notes"),
    producedAt: timestamp("produced_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: integer("created_by").references(() => users.id),
    /** Client-supplied token for duplicate-submission protection. */
    idempotencyKey: varchar("idempotency_key", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    saleOrderIdx: index("production_runs_sale_order_idx").on(table.saleOrderId),
    producedAtIdx: index("production_runs_produced_at_idx").on(table.producedAt),
    idempotencyIdx: index("production_runs_idempotency_idx").on(table.idempotencyKey),
  })
);
