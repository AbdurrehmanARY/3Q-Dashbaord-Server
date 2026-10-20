import { pgTable, serial, varchar, numeric, timestamp, unique, index } from "drizzle-orm/pg-core";
import { threadDenierEnum, threadStockTypeEnum } from "./thread.enums";

/**
 * The thread stock ledger — one row per distinct thread, covering both pools:
 *
 *   primary   (undyed): denier + colorName in {White, Black}, colorCode null
 *   secondary (dyed):   denier + colorName + colorCode  e.g. 75D / Brown / 22783
 *
 * One table rather than two because every consumer (planning, dyeing, reporting) wants to
 * ask the same question — "how many kg of this thread do we have?" — and the deduction
 * rule deliberately spans both pools (secondary first, then primary).
 *
 * `balanceKg` is the authoritative figure and is only ever moved inside a transaction that
 * also writes a `thread_stock_movements` row, so the ledger and its history cannot drift.
 */
export const threadStocks = pgTable(
  "thread_stocks",
  {
    id: serial("id").primaryKey(),
    stockType: threadStockTypeEnum("stock_type").notNull(),
    denier: threadDenierEnum("denier").notNull(),
    /** "White"/"Black" for primary; the dyed colour name (e.g. "Brown") for secondary. */
    colorName: varchar("color_name", { length: 100 }).notNull(),
    /** Dye lot colour code, e.g. "22783". Null for undyed primary stock. */
    colorCode: varchar("color_code", { length: 100 }),
    balanceKg: numeric("balance_kg", { precision: 14, scale: 3 }).default("0").notNull(),
    /** Running totals, for reporting — derived from the movement history. */
    receivedKg: numeric("received_kg", { precision: 14, scale: 3 }).default("0").notNull(),
    consumedKg: numeric("consumed_kg", { precision: 14, scale: 3 }).default("0").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // One ledger row per distinct thread. Postgres treats NULLs as distinct in a unique
    // index, so primary rows (colorCode null) are additionally guarded in the service.
    identity: unique("thread_stocks_identity_idx").on(
      table.stockType,
      table.denier,
      table.colorName,
      table.colorCode
    ),
    typeIdx: index("thread_stocks_type_idx").on(table.stockType),
    denierIdx: index("thread_stocks_denier_idx").on(table.denier),
  })
);
