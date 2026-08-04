import { pgTable, serial, integer, varchar, numeric, timestamp, unique, index } from "drizzle-orm/pg-core";
import { threadDenierEnum } from "./thread.enums";
import { wovenProductionLines } from "./woven-production-lines.table";
import { threadStocks } from "./thread-stocks.table";

/**
 * The thread colours planned for one woven line — **at most 8**, added and removed
 * dynamically during planning.
 *
 * The 8-colour ceiling and the "planning cannot proceed until every field is filled" rule
 * are enforced in the service (Postgres cannot express a per-parent row cap without a
 * trigger, and a trigger would hide the rule from the codebase). `sortOrder` is unique per
 * line, which is what keeps the UI's colour slots stable as rows are added and removed.
 *
 * `threadStockId` records which ledger row actually satisfied this colour, so a plan can be
 * traced to the exact stock it drew from — including when the deduction fell through from
 * secondary (dyed) to primary (undyed) stock.
 */
export const wovenThreadPlanItems = pgTable(
  "woven_thread_plan_items",
  {
    id: serial("id").primaryKey(),
    wovenProductionLineId: integer("woven_production_line_id")
      .notNull()
      .references(() => wovenProductionLines.id, { onDelete: "cascade" }),
    /** 1-8 — the colour slot, unique within the line. */
    sortOrder: integer("sort_order").notNull(),
    colorName: varchar("color_name", { length: 100 }).notNull(),
    denier: threadDenierEnum("denier").notNull(),
    colorCode: varchar("color_code", { length: 100 }).notNull(),
    weightKg: numeric("weight_kg", { precision: 14, scale: 3 }).notNull(),
    /** The stock row this colour was drawn from — null until planning reserves it. */
    threadStockId: integer("thread_stock_id").references(() => threadStocks.id, {
      onDelete: "set null",
    }),
    /** Unused thread weight returned after completion. */
    remainingWeightKg: numeric("remaining_weight_kg", { precision: 14, scale: 3 }).default("0").notNull(),
    /** Net weight consumed = weightKg - remainingWeightKg. */
    actualConsumedWeightKg: numeric("actual_consumed_weight_kg", { precision: 14, scale: 3 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slot: unique("woven_thread_plan_items_slot_idx").on(table.wovenProductionLineId, table.sortOrder),
    lineIdx: index("woven_thread_plan_items_line_idx").on(table.wovenProductionLineId),
  })
);
