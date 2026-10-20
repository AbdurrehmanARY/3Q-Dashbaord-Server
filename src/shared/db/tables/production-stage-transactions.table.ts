import { pgTable, serial, integer, varchar, decimal, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { productionOrderLines } from "./production-order-lines.table";
import { productionBatches } from "./production-batches.table";
import { users } from "./users.table";

/**
 * What a ledger row represents. Printing only credits; cutting and packaging each consume
 * the stage above them and credit their own, so completing one of those batches writes the
 * consume/credit pair.
 */
export const productionStageTxTypeEnum = pgEnum("production_stage_tx_type", [
  "print_credit",
  "cut_consume_print",
  "cut_credit",
  "package_consume_cut",
  "package_credit",
]);

/**
 * The append-only production ledger — the auditable record of every movement of material
 * between stages, so the exact production state can be reconstructed by replaying it:
 *
 *   PRINT   +30  print_credit
 *   CUT     -40  cut_consume_print    +40  cut_credit
 *   PACKAGE -40  package_consume_cut  +40  package_credit
 *
 * Each row snapshots **all three** positions after it (`printedAvailableAfter`,
 * `cuttedAvailableAfter`, `packagedTotalAfter`), so any point in the production history can
 * be read off a single row without replaying everything before it.
 *
 * Written in the same transaction as the counter update it explains, so the ledger and the
 * denormalised totals on `production_order_lines` can never disagree.
 */
export const productionStageTransactions = pgTable(
  "production_stage_transactions",
  {
    id: serial("id").primaryKey(),
    productionOrderLineId: integer("production_order_line_id")
      .notNull()
      .references(() => productionOrderLines.id, { onDelete: "cascade" }),
    /** The batch that caused this movement. Null for manual corrections. */
    batchId: integer("batch_id").references(() => productionBatches.id, { onDelete: "set null" }),

    stage: varchar("stage", { length: 50 }).notNull(),
    transactionType: productionStageTxTypeEnum("transaction_type").notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),

    /* --- Position after this movement, so a row is readable on its own --- */
    printedAvailableAfter: decimal("printed_available_after", { precision: 12, scale: 2 }).notNull(),
    cuttedAvailableAfter: decimal("cutted_available_after", { precision: 12, scale: 2 }).notNull(),
    packagedTotalAfter: decimal("packaged_total_after", { precision: 12, scale: 2 }).notNull(),

    createdByUserId: integer("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    lineIdx: index("production_stage_tx_line_idx").on(table.productionOrderLineId),
    batchIdx: index("production_stage_tx_batch_idx").on(table.batchId),
    typeIdx: index("production_stage_tx_type_idx").on(table.transactionType),
    createdAtIdx: index("production_stage_tx_created_at_idx").on(table.createdAt),
  })
);
