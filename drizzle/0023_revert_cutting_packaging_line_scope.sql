-- Revert migration 0023: restore line-scoping for cutting/packaging.
-- Each batch hangs off exactly one line again; numbering is per-line+stage (the
-- *_no_uq partial indexes already enforce that for every stage), so the order+stage
-- numbering index is obsolete.
DROP INDEX IF EXISTS "production_batches_order_stage_no_uq";
ALTER TABLE "production_batches" DROP CONSTRAINT IF EXISTS "production_batches_first_stage_one_line";
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_one_line"
  CHECK (num_nonnulls(production_order_line_id, woven_production_line_id) = 1);
