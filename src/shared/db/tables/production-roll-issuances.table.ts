import { pgTable, serial, integer, varchar, decimal, text, timestamp, index } from "drizzle-orm/pg-core";
import { productionOrderLines } from "./production-order-lines.table";
import { materials } from "./materials.table";
import { users } from "./users.table";

/**
 * Append-only record of raw material issued from inventory to a production line.
 *
 * This is the only thing that debits `inventory_rolls` — purchases credit stock, issuance
 * consumes it. `production_order_lines.issuedRolls` is a denormalized running sum kept in
 * sync in the same transaction; this table is the source of truth for the history.
 */
export const productionRollIssuances = pgTable(
  "production_roll_issuances",
  {
    id: serial("id").primaryKey(),
    productionOrderLineId: integer("production_order_line_id")
      .notNull()
      .references(() => productionOrderLines.id, { onDelete: "cascade" }),
    materialCode: varchar("material_code", { length: 100 })
      .notNull()
      .references(() => materials.code),
    rolls: decimal("rolls", { precision: 10, scale: 2 }).notNull(),
    note: text("note"),
    actorUserId: integer("actor_user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    lineIdx: index("production_roll_issuances_line_idx").on(table.productionOrderLineId),
    materialCodeIdx: index("production_roll_issuances_material_code_idx").on(table.materialCode),
  })
);
