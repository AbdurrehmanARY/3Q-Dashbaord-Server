-- 0027_waste_all_stages.sql
--
-- Allows waste (scrapped input) to be recorded at every stage, not just the
-- first stage (printing / weaving).
--
-- The production material-flow model is:
--   assigned = produced + wasted + released  (conservation)
-- Each of the three buckets may be non-zero at any stage, so the old
-- "waste belongs to the first stage" CHECK is removed. The remaining
-- invariants (non-negative quantities, output never exceeding input,
-- downstream never taking more than was produced) still hold at every stage.
--
-- `wasted_rolls` remains a cache column; it is maintained by
-- `batch-flow.repository.ts` (recordOutput / completeBatch) exactly as before —
-- the same append-only source of truth pattern used for every other batch
-- quantity.
--> statement-breakpoint

-- Drop the printing/weaving-only restriction. This must run BEFORE any
-- new object that references the relaxed rule, and it is unconditional:
-- a stale 0023 that never shipped makes this idempotent.
ALTER TABLE production_batches
  DROP CONSTRAINT IF EXISTS production_batches_waste_first_stage_only;
--> statement-breakpoint

-- Capture *why* material was scrapped, for yield reporting. Optional; a NULL
-- reason simply means "no explanation recorded" (e.g. legacy / pre-0027 rows).
ALTER TABLE production_batches
  ADD COLUMN waste_reason varchar(40);
COMMENT ON COLUMN production_batches.waste_reason IS
  'Optional reason for scrapped material: mis_cut | mis_print | damage | colour_reject | other';
