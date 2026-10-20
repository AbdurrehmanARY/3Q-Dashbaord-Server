-- Batch material flow: explicit consumption edges between batches.
--
-- The previous model tracked each stage's cumulative total and derived availability as
-- `printedTotal - cuttedTotal`. That gives correct totals and no lineage, so it could not
-- answer which printed rolls a given cutting batch consumed. This migration adds the edge
-- table that carries that lineage, plus the per-batch quantities it needs.
--
-- The four batch quantities, kept deliberately separate:
--   assigned_rolls  input reserved by the batch
--   produced_rolls  good output made so far (may rise while IN_PROGRESS)
--   wasted_rolls    input scrapped — PRINTING ONLY
--   consumed_rolls  how much of this batch's output downstream has taken

--> statement-breakpoint
-- Pre-migration batches carry no lineage and were test data only.
DELETE FROM "production_stage_transactions";--> statement-breakpoint
DELETE FROM "production_batches";--> statement-breakpoint

-- Counters are now projected from the batches, so start them from zero.
UPDATE "production_order_lines" SET
  "printed_rolls" = 0,
  "sent_to_cutting_rolls" = 0,
  "cut_rolls" = 0,
  "sent_to_packaging_rolls" = 0,
  "packaged_rolls" = 0,
  "packaged_qty" = 0,
  "status" = 'pending';--> statement-breakpoint

ALTER TABLE "production_batches" DROP COLUMN IF EXISTS "quantity";--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "batch_code" varchar(32);--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "produced_rolls" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "wasted_rolls" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "consumed_rolls" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint

-- Never writable: Postgres recomputes it on every write, so it cannot drift from the edges.
ALTER TABLE "production_batches"
  ADD COLUMN "available_rolls" numeric(12, 2)
  GENERATED ALWAYS AS ("produced_rolls" - "consumed_rolls") STORED;--> statement-breakpoint

UPDATE "production_batches" SET "batch_code" =
  CASE "stage" WHEN 'printing' THEN 'P-' WHEN 'cutting' THEN 'C-' ELSE 'PK-' END
  || lpad("batch_number"::text, 3, '0')
WHERE "batch_code" IS NULL;--> statement-breakpoint
ALTER TABLE "production_batches" ALTER COLUMN "batch_code" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "production_batches" ALTER COLUMN "status" SET DEFAULT 'PLANNED';--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "production_batches_line_stage_idx"
  ON "production_batches" ("production_order_line_id","stage");--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_line_stage_no_uq"
  UNIQUE ("production_order_line_id","stage","batch_number");--> statement-breakpoint

-- Target for the composite foreign keys below. This is what makes a cross-label-type or
-- stage-skipping edge structurally impossible rather than merely rejected in code.
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_id_line_stage_uq"
  UNIQUE ("id","production_order_line_id","stage");--> statement-breakpoint

ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_non_negative"
  CHECK ("assigned_rolls" >= 0 AND "produced_rolls" >= 0
     AND "wasted_rolls" >= 0 AND "consumed_rolls" >= 0);--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_output_within_input"
  CHECK ("produced_rolls" + "wasted_rolls" <= "assigned_rolls");--> statement-breakpoint
-- The over-allocation guarantee: downstream can never take more than exists.
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_consumed_within_produced"
  CHECK ("consumed_rolls" <= "produced_rolls");--> statement-breakpoint
-- Scrap is a printing concept; cutting and packaging release unused input upstream instead.
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_waste_printing_only"
  CHECK ("stage" = 'printing' OR "wasted_rolls" = 0);--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_packaging_no_machine"
  CHECK ("stage" <> 'packaging' OR "machine_id" IS NULL);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "batch_consumptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "destination_batch_id" integer NOT NULL,
  "source_batch_id" integer NOT NULL,
  "production_order_line_id" integer NOT NULL,
  "source_stage" "production_batch_stage" NOT NULL,
  "destination_stage" "production_batch_stage" NOT NULL,
  "rolls" numeric(12, 2) NOT NULL,
  "created_by_user_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "batch_consumptions_pair_uq" UNIQUE ("destination_batch_id","source_batch_id"),
  CONSTRAINT "batch_consumptions_positive" CHECK ("rolls" > 0),
  CONSTRAINT "batch_consumptions_not_self" CHECK ("source_batch_id" <> "destination_batch_id"),
  CONSTRAINT "batch_consumptions_valid_adjacency" CHECK (
    ("source_stage" = 'printing' AND "destination_stage" = 'cutting')
 OR ("source_stage" = 'cutting'  AND "destination_stage" = 'packaging')
  )
);--> statement-breakpoint

ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_line_fk"
  FOREIGN KEY ("production_order_line_id") REFERENCES "production_order_lines"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_user_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint

-- The source must be a batch of THIS line at THIS stage.
ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_source_fk"
  FOREIGN KEY ("source_batch_id","production_order_line_id","source_stage")
  REFERENCES "production_batches"("id","production_order_line_id","stage") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_destination_fk"
  FOREIGN KEY ("destination_batch_id","production_order_line_id","destination_stage")
  REFERENCES "production_batches"("id","production_order_line_id","stage") ON DELETE cascade;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "batch_consumptions_destination_idx" ON "batch_consumptions" ("destination_batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_consumptions_source_idx" ON "batch_consumptions" ("source_batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_consumptions_line_idx" ON "batch_consumptions" ("production_order_line_id");
