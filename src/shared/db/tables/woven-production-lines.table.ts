import { pgTable, serial, integer, varchar, numeric, date, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { productionOrders } from "./production-orders.table";
import { productionStatusEnum } from "./production-status.enum";
import { type SizePlan } from "../size-plans";

/**
 * One woven production line: Planning -> Weaving -> Cutting -> Packaging.
 *
 * Deliberately a separate table from `production_order_lines` rather than more nullable
 * columns on it. The printed line is expressed in ROLLS through five counters; the woven
 * line is expressed in PIECES through three, and its planning stage consumes thread rather
 * than roll stock. Sharing one table would mean ten mutually-exclusive nullable columns and
 * a stage chain that means different things per row — the printed workflow would have to be
 * re-verified on every woven change. Both still hang off the same `production_orders`
 * header, so the order-level concepts (numbering, sales-order link, status) stay shared.
 *
 * Stage gates (enforced in the service, mirrored on the client):
 *   cutting cannot start until weaving is 100% complete
 *   packaging cannot start until cutQty == wovenQty
 *   dispatch cannot start until packaging completes
 */
export const wovenProductionLines = pgTable(
  "woven_production_lines",
  {
    id: serial("id").primaryKey(),
    productionOrderId: integer("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "cascade" }),
    /** One row per label type, exactly like the printed side. */
    labelType: varchar("label_type", { length: 255 }).notNull(),
    /** Pieces to produce for this label type. */
    quantity: numeric("quantity", { precision: 14, scale: 2 }).notNull(),
    /**
     * Planned size variants of a Size Label line: `[{ size, quantity }]`. Empty for any
     * other label type. Each weaving batch on a size line records which size it runs, so
     * the floor can see exactly how much of each size remains (`lineFlowOf.sizes`).
     */
    sizes: jsonb("sizes").$type<SizePlan[]>().default([]).notNull(),

    /* ---------- Planning ---------- */
    /** Sum of every thread plan item's weight. Server-calculated, never client-supplied. */
    totalThreadWeightKg: numeric("total_thread_weight_kg", { precision: 14, scale: 3 })
      .default("0")
      .notNull(),
    /** True once thread colours + machine + operator are all set and stock is reserved. */
    planningCompletedAt: timestamp("planning_completed_at"),

    /* ---------- Weaving ----------
       Machine and operator live on the BATCHES now: a line no longer has a single weaver,
       it has a batch per machine-and-operator pairing. The counters below are projected
       from those batches. */
    wovenQty: numeric("woven_qty", { precision: 14, scale: 2 }).default("0").notNull(),
    weavingStatus: productionStatusEnum("weaving_status").default("pending").notNull(),
    weavingStartedAt: timestamp("weaving_started_at"),
    weavingEndedAt: timestamp("weaving_ended_at"),

    /* ---------- Cutting ---------- */
    cutQty: numeric("cut_qty", { precision: 14, scale: 2 }).default("0").notNull(),
    cuttingDate: date("cutting_date"),

    /* ---------- Packaging ---------- */
    packagedQty: numeric("packaged_qty", { precision: 14, scale: 2 }).default("0").notNull(),
    packagedWeightKg: numeric("packaged_weight_kg", { precision: 14, scale: 3 }).default("0").notNull(),
    packagingDate: date("packaging_date"),

    /** Derived from the stage counters, exactly like the printed line's status. */
    status: productionStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: index("woven_production_lines_order_idx").on(table.productionOrderId),
    statusIdx: index("woven_production_lines_status_idx").on(table.status),
  })
);
