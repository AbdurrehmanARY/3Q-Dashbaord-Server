import { pgTable, serial, integer, varchar, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { threadMovementTypeEnum } from "./thread.enums";
import { threadStocks } from "./thread-stocks.table";
import { users } from "./users.table";

/**
 * Append-only history of every thread stock movement — the audit trail behind
 * `thread_stocks.balanceKg`.
 *
 * `weightKg` is **signed**: positive credits the stock row, negative debits it. Each row is
 * written in the same transaction as the balance update it explains, so summing the
 * movements for a stock row always reproduces its balance. Nothing deletes from this table;
 * corrections are new `adjustment` rows.
 *
 * `referenceType`/`referenceId` point loosely at whatever caused the movement (a purchase,
 * a dye batch, a woven production line) — deliberately not a hard FK, so history survives
 * the source record being removed.
 */
export const threadStockMovements = pgTable(
  "thread_stock_movements",
  {
    id: serial("id").primaryKey(),
    threadStockId: integer("thread_stock_id")
      .notNull()
      .references(() => threadStocks.id, { onDelete: "cascade" }),
    movementType: threadMovementTypeEnum("movement_type").notNull(),
    /** Signed: + credits the stock, - debits it. */
    weightKg: numeric("weight_kg", { precision: 14, scale: 3 }).notNull(),
    /** Balance immediately after this movement — makes the history readable on its own. */
    balanceAfterKg: numeric("balance_after_kg", { precision: 14, scale: 3 }).notNull(),
    referenceType: varchar("reference_type", { length: 50 }),
    referenceId: integer("reference_id"),
    note: varchar("note", { length: 500 }),
    actorUserId: integer("actor_user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    stockIdx: index("thread_stock_movements_stock_idx").on(table.threadStockId),
    typeIdx: index("thread_stock_movements_type_idx").on(table.movementType),
    createdIdx: index("thread_stock_movements_created_idx").on(table.createdAt),
  })
);
