-- The woven workflow joins the batch material-flow model.
--
-- Woven runs Planning -> Weaving -> Cutting -> Packaging and is measured in PIECES, not
-- rolls. Rather than fork the batch tables, a batch now points at EITHER a printed line or
-- a woven line — exactly one, enforced by a check — so both workflows share one batch
-- lifecycle, one consumption-edge table and one set of guarantees.
--
-- Machine and operator move OFF the woven line and onto its batches: a woven line no longer
-- has a single weaver, it has a batch per machine-and-operator pairing, the same as printed.

--> statement-breakpoint
/* ---------------- woven lines gain label types, lose their resources ---------------- */

ALTER TABLE "woven_production_lines" ADD COLUMN "label_type" varchar(255);--> statement-breakpoint
UPDATE "woven_production_lines" SET "label_type" = 'Woven Label' WHERE "label_type" IS NULL;--> statement-breakpoint
ALTER TABLE "woven_production_lines" ALTER COLUMN "label_type" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "woven_production_lines" DROP COLUMN IF EXISTS "weaving_machine_id";--> statement-breakpoint
ALTER TABLE "woven_production_lines" DROP COLUMN IF EXISTS "weaving_operator_id";--> statement-breakpoint
ALTER TABLE "woven_production_lines" DROP COLUMN IF EXISTS "cutting_operator_id";--> statement-breakpoint
ALTER TABLE "woven_production_lines" DROP COLUMN IF EXISTS "packaging_operator_id";--> statement-breakpoint

/* ---------------- a batch belongs to a printed OR a woven line ---------------- */

ALTER TABLE "production_batches" ALTER COLUMN "production_order_line_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "woven_production_line_id" integer;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_woven_line_fk"
  FOREIGN KEY ("woven_production_line_id") REFERENCES "woven_production_lines"("id") ON DELETE cascade;--> statement-breakpoint

-- Exactly one line reference. A batch with neither would float free of any plan; a batch
-- with both would be counted twice.
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_one_line"
  CHECK (num_nonnulls("production_order_line_id", "woven_production_line_id") = 1);--> statement-breakpoint

-- Mirror of the printed composite-unique, so a woven consumption edge gets the same
-- structural guard against crossing label types.
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_id_woven_line_stage_uq"
  UNIQUE ("id","woven_production_line_id","stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "production_batches_woven_line_stage_idx"
  ON "production_batches" ("woven_production_line_id","stage");--> statement-breakpoint

-- Batch numbering restarts per line + stage on the woven side too.
CREATE UNIQUE INDEX IF NOT EXISTS "production_batches_woven_line_stage_no_uq"
  ON "production_batches" ("woven_production_line_id","stage","batch_number")
  WHERE "woven_production_line_id" IS NOT NULL;--> statement-breakpoint

-- Scrap belongs to the first stage of each workflow: printing, or weaving.
ALTER TABLE "production_batches" DROP CONSTRAINT IF EXISTS "production_batches_waste_printing_only";--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_waste_first_stage_only"
  CHECK ("stage" IN ('printing','weaving') OR "wasted_rolls" = 0);--> statement-breakpoint

/* ---------------- consumption edges, for both workflows ---------------- */

ALTER TABLE "batch_consumptions" ALTER COLUMN "production_order_line_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "batch_consumptions" ADD COLUMN "woven_production_line_id" integer;--> statement-breakpoint
ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_woven_line_fk"
  FOREIGN KEY ("woven_production_line_id") REFERENCES "woven_production_lines"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_one_line"
  CHECK (num_nonnulls("production_order_line_id", "woven_production_line_id") = 1);--> statement-breakpoint

-- The woven twins of the printed composite FKs. A composite foreign key with a NULL column
-- is not enforced, so each pair is inert for the workflow it does not apply to — printed
-- edges leave the woven columns null and vice versa.
ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_woven_source_fk"
  FOREIGN KEY ("source_batch_id","woven_production_line_id","source_stage")
  REFERENCES "production_batches"("id","woven_production_line_id","stage") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_woven_destination_fk"
  FOREIGN KEY ("destination_batch_id","woven_production_line_id","destination_stage")
  REFERENCES "production_batches"("id","woven_production_line_id","stage") ON DELETE cascade;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "batch_consumptions_woven_line_idx"
  ON "batch_consumptions" ("woven_production_line_id");--> statement-breakpoint

-- Weaving feeds cutting exactly as printing does. Everything else is still a stage skip.
ALTER TABLE "batch_consumptions" DROP CONSTRAINT IF EXISTS "batch_consumptions_valid_adjacency";--> statement-breakpoint
ALTER TABLE "batch_consumptions" ADD CONSTRAINT "batch_consumptions_valid_adjacency" CHECK (
     ("source_stage" = 'printing' AND "destination_stage" = 'cutting')
  OR ("source_stage" = 'weaving'  AND "destination_stage" = 'cutting')
  OR ("source_stage" = 'cutting'  AND "destination_stage" = 'packaging')
);
