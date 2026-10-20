-- 0025_line_scoped_cutting_packaging.sql
--
-- Makes cutting and packaging batches LINE-scoped.
--
-- WHY: every stage of a batch lifecycle is executed by ONE production line (one label type),
-- so every batch should hang off exactly one line. Up to here the live database said the
-- opposite for cutting and packaging: `production_batches_first_stage_one_line` required
-- `num_nonnulls(production_order_line_id, woven_production_line_id) = 0` for those two stages,
-- and `production_batches_order_stage_no_uq` numbered them per order. That forced every read
-- path to span the whole order and made a line-scoped read structurally empty — which is what
-- left the cutting and packaging panels blank on the dashboard.
--
-- This is the DDL that 0023_revert_cutting_packaging_line_scope.sql described but never
-- executed (its journal entry was written without the statements being run on the live
-- database). It is re-issued here under a fresh tag so `drizzle-kit migrate` actually applies
-- it. `production-batches.table.ts` already declares the target shape, so this migration is
-- what brings the database TO the schema, not the other way round.
--
-- ORDER OF OPERATIONS:
--  0. drop the order-scoped CHECK FIRST — it forbids exactly the rows steps 1–3 are about to
--     fill (it demands `num_nonnulls = 0` for cutting/packaging), so backfilling under it fails
--  1. give every line-less CUTTING batch the line of its largest contributor
--  2. give every line-less PACKAGING batch the line of its largest contributor (a cutting
--     batch, which step 1 has just given a line)
--  3. fall back to the order's first line for anything with no edges left to read
--  4. refuse to continue if any line-less batch survived (a clear error beats a CHECK violation)
--  5. add the line-scoped CHECK and drop the order-scoped numbering index
-- Steps 0–5 run as one migration; PostgreSQL DDL is transactional, so the window in which no
-- line CHECK is present exists only inside that transaction (and step 4 guards its end).
--
-- No renumbering is needed: `batch_number` was unique per (order, stage) and a line belongs to
-- one order, so the same number cannot repeat within a line. The two partial unique indexes
-- (`production_batches_printed_no_uq`, `production_batches_woven_no_uq`) already cover
-- (line, stage, batch_number) for every stage and simply start applying to cut/package rows.

/* ---------------- 0. release the order-scoped CHECK the backfill would violate ------- */
/* `production_batches_first_stage_one_line` demands num_nonnulls(...) = 0 for cutting and
   packaging, i.e. it forbids the very rows steps 1–3 are about to fill. It has to go first;
   the line-scoped CHECK replaces it in step 5, still inside this migration. */

ALTER TABLE "production_batches"
  DROP CONSTRAINT IF EXISTS "production_batches_first_stage_one_line";

/* ------------------------------------------------------------------ 1. cutting */

WITH contributor AS (
  SELECT e.destination_batch_id AS batch_id,
         COALESCE(s.production_order_line_id, s.woven_production_line_id) AS line_id,
         SUM(e.rolls) AS rolls
  FROM batch_consumptions e
  JOIN production_batches s ON s.id = e.source_batch_id
  WHERE s.stage IN ('printing', 'weaving')
    AND COALESCE(s.production_order_line_id, s.woven_production_line_id) IS NOT NULL
  GROUP BY 1, 2
),
picked AS (
  SELECT batch_id, line_id
  FROM (
    SELECT batch_id, line_id,
           ROW_NUMBER() OVER (PARTITION BY batch_id ORDER BY rolls DESC, line_id) AS rn
    FROM contributor
  ) ranked
  WHERE rn = 1
),
target AS (
  SELECT b.id AS batch_id,
         p.line_id,
         CASE WHEN w.product_type = 'woven' THEN 'woven' ELSE 'printed' END AS line_kind
  FROM production_batches b
  JOIN picked p ON p.batch_id = b.id
  JOIN production_orders o ON o.id = b.production_order_id
  JOIN work_orders w ON w.id = o.work_order_id
  WHERE b.stage = 'cutting'
    AND b.production_order_line_id IS NULL
    AND b.woven_production_line_id IS NULL
)
UPDATE production_batches b
SET production_order_line_id = CASE WHEN t.line_kind = 'woven' THEN NULL ELSE t.line_id END,
    woven_production_line_id  = CASE WHEN t.line_kind = 'woven' THEN t.line_id ELSE NULL END
FROM target t
WHERE b.id = t.batch_id;

/* ---------------------------------------------------------------- 2. packaging */

WITH contributor AS (
  SELECT e.destination_batch_id AS batch_id,
         COALESCE(s.production_order_line_id, s.woven_production_line_id) AS line_id,
         SUM(e.rolls) AS rolls
  FROM batch_consumptions e
  JOIN production_batches s ON s.id = e.source_batch_id
  WHERE s.stage = 'cutting'
    AND COALESCE(s.production_order_line_id, s.woven_production_line_id) IS NOT NULL
  GROUP BY 1, 2
),
picked AS (
  SELECT batch_id, line_id
  FROM (
    SELECT batch_id, line_id,
           ROW_NUMBER() OVER (PARTITION BY batch_id ORDER BY rolls DESC, line_id) AS rn
    FROM contributor
  ) ranked
  WHERE rn = 1
),
target AS (
  SELECT b.id AS batch_id,
         p.line_id,
         CASE WHEN w.product_type = 'woven' THEN 'woven' ELSE 'printed' END AS line_kind
  FROM production_batches b
  JOIN picked p ON p.batch_id = b.id
  JOIN production_orders o ON o.id = b.production_order_id
  JOIN work_orders w ON w.id = o.work_order_id
  WHERE b.stage = 'packaging'
    AND b.production_order_line_id IS NULL
    AND b.woven_production_line_id IS NULL
)
UPDATE production_batches b
SET production_order_line_id = CASE WHEN t.line_kind = 'woven' THEN NULL ELSE t.line_id END,
    woven_production_line_id  = CASE WHEN t.line_kind = 'woven' THEN t.line_id ELSE NULL END
FROM target t
WHERE b.id = t.batch_id;

/* ------------------------------------------- 3. fallback: the order's first line */

WITH target AS (
  SELECT b.id AS batch_id,
         CASE WHEN w.product_type = 'woven' THEN 'woven' ELSE 'printed' END AS line_kind,
         CASE WHEN w.product_type = 'woven'
              THEN (SELECT MIN(wl.id) FROM woven_production_lines wl
                     WHERE wl.production_order_id = b.production_order_id)
              ELSE (SELECT MIN(pl.id) FROM production_order_lines pl
                     WHERE pl.production_order_id = b.production_order_id)
         END AS line_id
  FROM production_batches b
  JOIN production_orders o ON o.id = b.production_order_id
  JOIN work_orders w ON w.id = o.work_order_id
  WHERE b.production_order_line_id IS NULL
    AND b.woven_production_line_id IS NULL
)
UPDATE production_batches b
SET production_order_line_id = CASE WHEN t.line_kind = 'woven' THEN NULL ELSE t.line_id END,
    woven_production_line_id  = CASE WHEN t.line_kind = 'woven' THEN t.line_id ELSE NULL END
FROM target t
WHERE b.id = t.batch_id AND t.line_id IS NOT NULL;

/* ------------------------------------------------------- 4. refuse to continue */

DO $$
DECLARE orphan_count integer;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM production_batches
  WHERE production_order_line_id IS NULL AND woven_production_line_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Cannot make cutting/packaging line-scoped: % batch(es) still carry no line. Their '
      'production order has no label type to attach them to — give the order a line, set the '
      'batch production_order_line_id / woven_production_line_id, then re-run this migration.',
      orphan_count;
  END IF;
END $$;

/* ------------------------------------------------- 5. swap the constraint + index */

DROP INDEX IF EXISTS "production_batches_order_stage_no_uq";

ALTER TABLE "production_batches"
  DROP CONSTRAINT IF EXISTS "production_batches_one_line";

ALTER TABLE "production_batches"
  ADD CONSTRAINT "production_batches_one_line"
  CHECK (num_nonnulls(production_order_line_id, woven_production_line_id) = 1);

/* The per-line + per-stage numbering indexes every stage now relies on. Already present on the
   live database; created here so a freshly provisioned one matches without a separate step. */
CREATE UNIQUE INDEX IF NOT EXISTS "production_batches_printed_no_uq"
  ON "production_batches" (production_order_line_id, stage, batch_number)
  WHERE production_order_line_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "production_batches_woven_no_uq"
  ON "production_batches" (woven_production_line_id, stage, batch_number)
  WHERE woven_production_line_id IS NOT NULL;
