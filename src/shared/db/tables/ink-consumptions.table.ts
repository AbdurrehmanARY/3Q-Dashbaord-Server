import { pgTable, serial, varchar, integer, decimal, text, timestamp, index } from "drizzle-orm/pg-core";
import { operators } from "./operators.table";

/**
 * Ink consumption log — append-only. Each row deducts `weight` (and `qtyAssigned`) from the
 * derived ink stock for its `materialCode`. `operatorId` links the floor operator who used
 * it (nullable), with `operatorName` snapshotted so history survives an operator rename.
 */
export const inkConsumptions = pgTable(
  "ink_consumptions",
  {
    id: serial("id").primaryKey(),
    materialCode: varchar("material_code", { length: 100 }).notNull(),
    /** Units drawn. */
    qtyAssigned: decimal("qty_assigned", { precision: 12, scale: 2 }).notNull(),
    operatorId: integer("operator_id").references(() => operators.id),
    operatorName: varchar("operator_name", { length: 200 }),
    /** Weight consumed — this is what debits ink stock. */
    weight: decimal("weight", { precision: 14, scale: 3 }).notNull(),
    note: text("note"),
    consumedAt: timestamp("consumed_at").defaultNow().notNull(),
  },
  (table) => ({
    materialCodeIdx: index("ink_consumptions_material_code_idx").on(table.materialCode),
    operatorIdx: index("ink_consumptions_operator_idx").on(table.operatorId),
  })
);
