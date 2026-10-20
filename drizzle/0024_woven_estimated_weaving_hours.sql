-- Estimated weaving time: a derived, server-calculated figure stored on the woven
-- specification so the work-order list does not recompute it from raw loom inputs on
-- every row. Formula (matches work-order.service.ts / production-order.repository.ts):
--
--   hours = round2( (total_qty / repeat) * pick / (speed * 60) )
--
-- with speed falling back to 600 RPM when unset/0, and 0 when repeat or pick is 0.

--> statement-breakpoint
ALTER TABLE "woven_work_order_details"
  ADD COLUMN "estimated_weaving_hours" numeric(12,2) NOT NULL DEFAULT '0';--> statement-breakpoint
UPDATE "woven_work_order_details" AS d
SET "estimated_weaving_hours" = ROUND(
  CASE
    WHEN d."repeat" > 0 AND d."pick" > 0 AND wo."total_qty" > 0 THEN
      ((wo."total_qty"::numeric / d."repeat") * d."pick")
      / ((CASE WHEN d."speed" > 0 THEN d."speed" ELSE 600 END) * 60)
    ELSE 0
  END::numeric,
  2
)
FROM "work_orders" AS wo
WHERE wo."id" = d."work_order_id";