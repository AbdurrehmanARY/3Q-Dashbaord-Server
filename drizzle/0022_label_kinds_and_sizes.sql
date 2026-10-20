-- Size Label support: a planned label type can carry the sizes it is split into, and a
-- weaving batch records which of those sizes it is running.
--
--   woven_production_lines.sizes    jsonb  [{ size, quantity }] — a Size Label line's plan
--   production_order_lines.sizes     jsonb  (same shape, printed twin for editor parity)
--   production_batches.label_size    which planned size a weaving batch weaves (else NULL)
--
-- Per-size "remaining" is a DERIVED figure — planned minus the sum assigned to live
-- weaving batches of that size — so no stored counter can drift out of sync.

--> statement-breakpoint
ALTER TABLE "woven_production_lines" ADD COLUMN "sizes" jsonb NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "production_order_lines" ADD COLUMN "sizes" jsonb NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "label_size" varchar(120);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "production_batches_woven_size_idx"
  ON "production_batches" ("woven_production_line_id","stage","label_size");