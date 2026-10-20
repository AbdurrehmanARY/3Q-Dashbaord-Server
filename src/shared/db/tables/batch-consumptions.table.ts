import {
  pgTable,
  serial,
  integer,
  decimal,
  timestamp,
  index,
  unique,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { productionBatches, productionBatchStageEnum } from "./production-batches.table";
import { productionOrders } from "./production-orders.table";
import { users } from "./users.table";

/**
 * A directed edge in the material flow: `rolls` rolls of `sourceBatch`'s output were
 * consumed by `destinationBatch`.
 *
 * This table is the source of truth for every availability figure in the system.
 * `production_batches.consumedRolls` is a transactionally-maintained cache of
 * `SUM(rolls) GROUP BY source_batch_id` — never the other way round.
 *
 * It is what makes the three hard traceability requirements expressible:
 *   - many sources feeding one batch   -> many rows sharing a destinationBatchId
 *   - one source feeding many batches  -> many rows sharing a sourceBatchId
 *   - partial consumption              -> rolls < the source's producedRolls
 *
 * The ORDER id is denormalised purely so the two composite foreign keys below can make an
 * invalid edge *unrepresentable* rather than merely rejected: an edge may cross LABEL TYPES —
 * that is exactly what cutting and packaging do — but it can never cross production ORDERS.
 *
 * Label type is deliberately absent. A cutting or packaging batch spans several, so recording
 * one here would be a lie. An edge's label type is always the SOURCE batch's line (weaving
 * and printing are per-label-type), which is what makes the per-label-type split of a
 * cutting/packaging batch derivable from its edges alone.
 */
export const batchConsumptions = pgTable(
  "batch_consumptions",
  {
    id: serial("id").primaryKey(),

    destinationBatchId: integer("destination_batch_id").notNull(),
    sourceBatchId: integer("source_batch_id").notNull(),

    /* --- denormalised scope guard, written by the service, enforced by the FKs below ---
       Both ends of the edge must be batches of this order. */
    productionOrderId: integer("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "cascade" }),
    sourceStage: productionBatchStageEnum("source_stage").notNull(),
    destinationStage: productionBatchStageEnum("destination_stage").notNull(),

    /** Rolls taken. Partial by design — never has to equal the source's output. */
    rolls: decimal("rolls", { precision: 12, scale: 2 }).notNull(),

    createdByUserId: integer("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    /**
     * Both ends of an edge must live in THIS order. This is the structural guard that
     * replaces the old per-line composite keys: an edge may cross label types (that is the
     * whole point of cutting and packaging) but never cross production orders.
     *
     * A cutting batch's source is a weaving/printing batch; a packaging batch's source is a
     * cutting batch. `batch_consumptions_valid_adjacency` below pins the stage pair.
     */
    foreignKey({
      columns: [table.sourceBatchId, table.productionOrderId],
      foreignColumns: [productionBatches.id, productionBatches.productionOrderId],
      name: "batch_consumptions_source_fk",
    }).onDelete("restrict"),

    /** Same for the destination — and deleting a batch takes its inbound edges with it. */
    foreignKey({
      columns: [table.destinationBatchId, table.productionOrderId],
      foreignColumns: [productionBatches.id, productionBatches.productionOrderId],
      name: "batch_consumptions_destination_fk",
    }).onDelete("cascade"),

    /**
     * One edge per (destination, source) pair. Taking more from the same source is an
     * UPDATE of `rolls`, not a second row — which keeps "edit the consumption" a
     * single-statement operation and the history unambiguous.
     */
    unique("batch_consumptions_pair_uq").on(table.destinationBatchId, table.sourceBatchId),

    index("batch_consumptions_destination_idx").on(table.destinationBatchId),
    index("batch_consumptions_source_idx").on(table.sourceBatchId),
    index("batch_consumptions_order_idx").on(table.productionOrderId),

    check("batch_consumptions_positive", sql`rolls > 0`),
    check("batch_consumptions_not_self", sql`source_batch_id <> destination_batch_id`),
    /**
     * Weaving feeds cutting exactly as printing does. Everything else is a stage skip.
     * Adding a workflow means adding its pair here and to `UPSTREAM_OF` in the helpers.
     *
     * This is also what bounds the lineage depth at two — cutting always draws from a
     * first-stage batch, packaging always draws from cutting — which is what lets the
     * per-label-type split be derived with a fixed two-level join instead of recursion.
     */
    check(
      "batch_consumptions_valid_adjacency",
      sql`(source_stage = 'printing' AND destination_stage = 'cutting')
       OR (source_stage = 'weaving'  AND destination_stage = 'cutting')
       OR (source_stage = 'cutting'  AND destination_stage = 'packaging')`
    ),
  ]
);
