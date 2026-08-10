import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Why a production batch was run. Every batch execution is an append-only row in
 * `production_runs`; the reason distinguishes the first pass from later corrective passes.
 * `initial` is the default and is what legacy production rows migrate in as.
 */
export const productionRunReasonEnum = pgEnum("production_run_reason", [
  "initial",
  "shortfall",
  "additional_order",
  "recut",
  "rework",
  "retry",
  "other",
]);
