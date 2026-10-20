-- Weaving joins the batch stages.
--
-- This is deliberately alone in its own migration: Postgres refuses to USE a newly added
-- enum value in the same transaction that adds it, and 0021 puts 'weaving' inside check
-- constraints. Splitting them is the only way both can run on a fresh database.
--
-- Added BEFORE 'printing' so `ORDER BY stage` reads in pipeline order for both workflows:
--   printed  printing -> cutting -> packaging
--   woven    weaving  -> cutting -> packaging
ALTER TYPE "public"."production_batch_stage" ADD VALUE IF NOT EXISTS 'weaving' BEFORE 'printing';
