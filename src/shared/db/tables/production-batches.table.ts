import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  text,
  timestamp,
  index,
  unique,
  uniqueIndex,
  check,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { productionOrderLines } from "./production-order-lines.table";
import { productionOrders } from "./production-orders.table";
import { wovenProductionLines } from "./woven-production-lines.table";
import { machines } from "./machines.table";
import { operators } from "./operators.table";
import { users } from "./users.table";

/** The three stages material flows through. */
export const productionBatchStageEnum = pgEnum("production_batch_stage", [
  /** Woven's first stage. Declared first so `ORDER BY stage` reads in pipeline order. */
  "weaving",
  "printing",
  "cutting",
  "packaging",
]);

/**
 * A batch's lifecycle. Only `COMPLETED` batches contribute to a stage total — a `CANCELLED`
 * batch must never affect production figures. `ASSIGNED`/`IN_PROGRESS` are what hold a
 * machine/operator reservation, so historical usage never makes a resource permanently
 * unavailable.
 */
export const productionBatchStatusEnum = pgEnum("production_batch_status", [
  "PLANNED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

/**
 * One execution of one stage, by one machine and one operator, for one label type.
 *
 * This is what makes multi-machine production expressible: printing 80 rolls across three
 * machines is three batch rows, not one line with a single `printingMachineId`. Batches are
 * append-only history — a correction is a new batch or a cancellation, never an overwrite.
 *
 * `quantity` is always an INCREMENT ("this batch processed 10 rolls"), never a running
 * total. Stage totals are the sum of `COMPLETED` batches.
 *
 * Every batch hangs off exactly one line (the `production_order_line_id` /
 * `woven_production_line_id` pair below). That line IS the batch's label type at every
 * stage — weaving and printing are per-label-type by definition, and cutting/packaging now
 * carry a line too, so their numbering restarts per line + stage (enforced by the partial
 * unique indexes below). The unit follows from which column is set: printed lines count
 * ROLLS, woven lines count PIECES.
 */
export const productionBatches = pgTable(
  "production_batches",
  {
    id: serial("id").primaryKey(),
        /**
     * The order this batch belongs to. Every batch hangs off exactly one line
     * (the `production_order_line_id` / `woven_production_line_id` pair below),
     * and `production_order_id` is carried so the composite foreign keys on
     * `batch_consumptions` can enforce same-order edges without a second join.
     */
    productionOrderId: integer("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "cascade" }),
    /**
     * Which label type the batch runs — set for every stage and non-NULL for every batch.
     * Each batch hangs off exactly one line; that line IS its label type at every stage.
     *
     * Weaving and printing are per-label-type, so their line is the label type.
     * Cutting and packaging are also per-line now (each line has one cutting and one
     * packaging workflow), so they too carry a line — and their numbering restarts
     * per line + stage, enforced by the partial unique indexes below.
     *
     * The unit follows from which one is set: printed lines count ROLLS, woven lines count
     * PIECES. The columns below are named for the printed case that came first; read them as
     * "quantity" on a woven batch, and as the batch's overall total on any stage.
     */
    productionOrderLineId: integer("production_order_line_id").references(
      () => productionOrderLines.id,
      { onDelete: "cascade" }
    ),
    wovenProductionLineId: integer("woven_production_line_id").references(
      () => wovenProductionLines.id,
      { onDelete: "cascade" }
    ),
    stage: productionBatchStageEnum("stage").notNull(),
    /** Sequence number within this line + stage: Printing #1, #2, … Cutting #1, #2, … */
    batchNumber: integer("batch_number").notNull(),
    /** Human-facing identifier derived once from stage + number: P-001, C-001, PK-001. */
    batchCode: varchar("batch_code", { length: 32 }).notNull(),
    /**
     * Which planned size a WEAVING batch runs — a Size Label line only. NULL everywhere
     * else. Together with `woven_production_lines.sizes` it powers the per-size remaining
     * figures (`lineFlowOf.sizes`); the check that the size is one of the line's planned
     * sizes lives in `batch-flow.repository.createBatch`.
     */
    labelSize: varchar("label_size", { length: 120 }),

    /** Packaging may run without a machine; printing and cutting require one. */
    machineId: integer("machine_id").references(() => machines.id),
    operatorId: integer("operator_id").references(() => operators.id),

    /**
     * The four quantities. Collapsing any two of them is what makes a batch system
     * untraceable, so they stay separate:
     *
     *   assignedRolls  input reserved by this batch. For printing it is drawn from the
     *                  line's planned rolls; for cutting/packaging it always equals the
     *                  sum of this batch's `batch_consumptions` edges.
     *   producedRolls  good output made so far. Rises while the batch is IN_PROGRESS, so
     *                  partial output reaches the next stage without waiting for completion.
     *   wastedRolls    input destroyed, at any stage. NULL means "no reason recorded".
     *                  their unused input is released back upstream instead.
     *   consumedRolls  how much of THIS batch's output downstream batches have taken.
     *                  A transactionally-maintained cache of the edge table.
     */
    assignedRolls: decimal("assigned_rolls", { precision: 12, scale: 2 }).default("0").notNull(),
    producedRolls: decimal("produced_rolls", { precision: 12, scale: 2 }).default("0").notNull(),
    wastedRolls: decimal("wasted_rolls", { precision: 12, scale: 2 }).default("0").notNull(),
    /**
     * Optional reason the wasted rolls were scrapped � for yield reporting.
     * NULL means "no reason recorded". Added in 0027_waste_all_stages when waste
     * was allowed at every stage, not just printing/weaving.
     */
    wasteReason: varchar("waste_reason", { length: 40 }),
    consumedRolls: decimal("consumed_rolls", { precision: 12, scale: 2 }).default("0").notNull(),
    /**
     * produced − consumed, computed by Postgres on every write. Never writable, so it
     * cannot drift from the edge table the way a hand-maintained figure would.
     */
    availableRolls: decimal("available_rolls", { precision: 12, scale: 2 }).generatedAlwaysAs(
      sql`produced_rolls - consumed_rolls`
    ),

    /** Labels packaged by this batch (packaging stage only). */
    packagedQty: decimal("packaged_qty", { precision: 12, scale: 2 }).default("0").notNull(),

    status: productionBatchStatusEnum("status").default("PLANNED").notNull(),
    notes: text("notes"),
    createdByUserId: integer("created_by_user_id").references(() => users.id),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  /* Array form (not the object form used elsewhere) because check constraints are only
     expressible here — the object overload is deprecated in Drizzle 0.36. */
  (table) => [
    index("production_batches_line_idx").on(table.productionOrderLineId),
    /** Covers the hot query: every batch of one stage for one line. */
    index("production_batches_line_stage_idx").on(table.productionOrderLineId, table.stage),
    index("production_batches_stage_idx").on(table.stage),
    index("production_batches_machine_idx").on(table.machineId),
    index("production_batches_operator_idx").on(table.operatorId),
    index("production_batches_status_idx").on(table.status),
    index("production_batches_created_at_idx").on(table.createdAt),

    /** Batch numbering restarts per line + stage for the first stages of each workflow. */
    uniqueIndex("production_batches_printed_no_uq")
      .on(table.productionOrderLineId, table.stage, table.batchNumber)
      .where(sql`${table.productionOrderLineId} IS NOT NULL`),
    uniqueIndex("production_batches_woven_no_uq")
      .on(table.wovenProductionLineId, table.stage, table.batchNumber)
      .where(sql`${table.wovenProductionLineId} IS NOT NULL`),
    /**
     * Target for the composite foreign keys on `batch_consumptions`. Edges are scoped to
     * one order, so a batch can never consume from, or feed, another order's material.
     */
    unique("production_batches_id_order_uq").on(table.id, table.productionOrderId),
    index("production_batches_woven_line_stage_idx").on(
      table.wovenProductionLineId,
      table.stage
    ),
    /** Covers the per-size remaining aggregate: weaving batches of one line, per size. */
    index("production_batches_woven_size_idx").on(
      table.wovenProductionLineId,
      table.stage,
      table.labelSize
    ),

    check(
      "production_batches_non_negative",
      sql`assigned_rolls >= 0 AND produced_rolls >= 0 AND wasted_rolls >= 0 AND consumed_rolls >= 0`
    ),
    /** Output can never exceed the input reserved for it. */
    check(
      "production_batches_output_within_input",
      sql`produced_rolls + wasted_rolls <= assigned_rolls`
    ),
    /** The over-allocation guarantee: downstream can never take more than exists. */
    check("production_batches_consumed_within_produced", sql`consumed_rolls <= produced_rolls`),
    /**
     * Scrap / waste may be recorded at ANY stage now (printing, weaving, cutting,
     * packaging). The first-stage-only restriction was dropped in 0027_waste_all_stages.
     * Output can never exceed input: produced + wasted <= assigned.
     */
    /**
     * The label-type split lives at the line of each batch — every batch hangs off
     * exactly one line: weaving/printing on `production_order_line_id`, cutting/packaging
     * on `woven_production_line_id`. No batch is ever label-type-independent.
     */
    check(
      "production_batches_one_line",
      sql`num_nonnulls(production_order_line_id, woven_production_line_id) = 1`
    ),
    /** Packaging has an operator but no machine. */
    check(
      "production_batches_packaging_no_machine",
      sql`stage <> 'packaging' OR machine_id IS NULL`
    ),
  ]
);
