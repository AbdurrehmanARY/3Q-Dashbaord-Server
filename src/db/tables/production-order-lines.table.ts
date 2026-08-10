import { pgTable, serial, integer, varchar, decimal, text, timestamp, index } from "drizzle-orm/pg-core";
import { productionOrders } from "./production-orders.table";
import { productionStatusEnum } from "./production-status.enum";
import { machines } from "./machines.table";
import { operators } from "./operators.table";
import { materials } from "./materials.table";

/**
 * One row = one label type planned within a production order.
 *
 * Production is tracked as **cumulative roll counts** — a roll is not an entity and
 * there is no per-roll lifecycle. The five counters below move independently so that
 * printing, cutting and packaging can run concurrently:
 *
 *   printedRolls -> sentToCuttingRolls -> cutRolls -> sentToPackagingRolls -> packagedRolls
 *
 * `packagedQty` is the only figure denominated in labels; it records finished output
 * against `quantity` for order/reporting purposes and does not gate the roll flow.
 */
export const productionOrderLines = pgTable(
  "production_order_lines",
  {
    id: serial("id").primaryKey(),
    productionOrderId: integer("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "cascade" }),
    labelType: varchar("label_type", { length: 255 }).notNull(),

    /* --- Planning (Phase 2) --- */
    quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),

    /* --- Roll planning (Phase 3) --- */
    /** Label size in millimetres — an input to the required-rolls formula. */
    labelSize: decimal("label_size", { precision: 10, scale: 2 }).notNull(),
    /** Roll length in metres. Retained for back-compat only — no longer part of any formula. */
    rollLength: decimal("roll_length", { precision: 10, scale: 2 }),
    /** Calculated server-side: quantity / (7800 / (labelSize / 25)). Never client-supplied. */
    requiredRolls: decimal("required_rolls", { precision: 12, scale: 4 }).notNull(),
    /** Manual buffer added by the production manager. */
    extraRolls: decimal("extra_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    /** Total rolls issued = ceil(requiredRolls + extraRolls); a whole number. Recomputed on every plan write. */
    totalRolls: decimal("total_rolls", { precision: 10, scale: 2 }).notNull(),
    /** Total weight = materials.weightPerRoll * totalRolls, captured at plan time. Read-only. */
    totalWeight: decimal("total_weight", { precision: 14, scale: 4 }),

    /* --- Material issuance from inventory --- */
    /** Raw material this label type is printed on. Required before rolls can be issued. */
    materialCode: varchar("material_code", { length: 100 }).references(() => materials.code),
    /** Denormalized running sum of `production_roll_issuances`; kept in sync transactionally. */
    issuedRolls: decimal("issued_rolls", { precision: 10, scale: 2 }).default("0").notNull(),

    /* --- Cumulative roll flow (Phases 4-8) --- */
    printedRolls: decimal("printed_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    sentToCuttingRolls: decimal("sent_to_cutting_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    cutRolls: decimal("cut_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    sentToPackagingRolls: decimal("sent_to_packaging_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    packagedRolls: decimal("packaged_rolls", { precision: 10, scale: 2 }).default("0").notNull(),

    /* --- Output in labels --- */
    packagedQty: decimal("packaged_qty", { precision: 12, scale: 2 }).default("0").notNull(),

    /* --- Resource assignment. Packaging has an operator but no machine. --- */
    printingMachineId: integer("printing_machine_id").references(() => machines.id),
    printingOperatorId: integer("printing_operator_id").references(() => operators.id),
    cuttingMachineId: integer("cutting_machine_id").references(() => machines.id),
    cuttingOperatorId: integer("cutting_operator_id").references(() => operators.id),
    packagingOperatorId: integer("packaging_operator_id").references(() => operators.id),

    /**
     * When each stage finished — stamped the moment its counter first reaches the planned
     * roll count, and cleared if the count is later corrected back below it. Together with
     * the operator columns above these give a finished order full traceability: who did
     * each stage, and when it completed.
     */
    printingCompletedAt: timestamp("printing_completed_at"),
    cuttingCompletedAt: timestamp("cutting_completed_at"),
    packagingCompletedAt: timestamp("packaging_completed_at"),

    /* --- Stock Reconciliation after completion --- */
    usedRolls: decimal("used_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    usedWeight: decimal("used_weight", { precision: 14, scale: 4 }).default("0").notNull(),
    extraRollsReturned: decimal("extra_rolls_returned", { precision: 10, scale: 2 }).default("0").notNull(),
    extraWeight: decimal("extra_weight", { precision: 14, scale: 4 }).default("0").notNull(),
    reconciledAt: timestamp("reconciled_at"),

    status: productionStatusEnum("status").default("pending").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    productionOrderIdx: index("production_order_lines_order_idx").on(table.productionOrderId),
    statusIdx: index("production_order_lines_status_idx").on(table.status),
    materialCodeIdx: index("production_order_lines_material_code_idx").on(table.materialCode),
    printingMachineIdx: index("production_order_lines_printing_machine_idx").on(table.printingMachineId),
    printingOperatorIdx: index("production_order_lines_printing_operator_idx").on(table.printingOperatorId),
    cuttingMachineIdx: index("production_order_lines_cutting_machine_idx").on(table.cuttingMachineId),
    cuttingOperatorIdx: index("production_order_lines_cutting_operator_idx").on(table.cuttingOperatorId),
    packagingOperatorIdx: index("production_order_lines_packaging_operator_idx").on(table.packagingOperatorId),
  })
);
