import { pgTable, serial, integer, varchar, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { threadDenierEnum } from "./thread.enums";
import { threadStocks } from "./thread-stocks.table";
import { users } from "./users.table";

/**
 * A dyeing run: undyed primary stock in, dyed secondary stock out.
 *
 *   100 kg White 75D  ->  dye  ->  20 kg Brown (22783) 75D
 *
 * Input and output weights are recorded separately because dyeing has real process loss —
 * they are not expected to match, and forcing them to would falsify the ledger. Both sides
 * are applied in one transaction together with their `thread_stock_movements` rows, so a
 * batch can always be traced from the finished colour back to the white thread it came from.
 */
export const threadDyeBatches = pgTable(
  "thread_dye_batches",
  {
    id: serial("id").primaryKey(),
    batchNumber: varchar("batch_number", { length: 100 }).notNull().unique(),
    /** The primary (undyed) stock row consumed. */
    fromStockId: integer("from_stock_id")
      .notNull()
      .references(() => threadStocks.id, { onDelete: "restrict" }),
    /** The secondary (dyed) stock row credited. */
    toStockId: integer("to_stock_id")
      .notNull()
      .references(() => threadStocks.id, { onDelete: "restrict" }),
    denier: threadDenierEnum("denier").notNull(),
    /** Resulting colour, denormalised onto the batch so history survives a stock rename. */
    colorName: varchar("color_name", { length: 100 }).notNull(),
    colorCode: varchar("color_code", { length: 100 }).notNull(),
    inputWeightKg: numeric("input_weight_kg", { precision: 14, scale: 3 }).notNull(),
    outputWeightKg: numeric("output_weight_kg", { precision: 14, scale: 3 }).notNull(),
    notes: varchar("notes", { length: 500 }),
    actorUserId: integer("actor_user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    fromIdx: index("thread_dye_batches_from_idx").on(table.fromStockId),
    toIdx: index("thread_dye_batches_to_idx").on(table.toStockId),
  })
);
