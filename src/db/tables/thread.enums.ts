import { pgEnum } from "drizzle-orm/pg-core";

/** The four thread weights the facility purchases. */
export const threadDenierEnum = pgEnum("thread_denier", ["45", "75", "100", "150"]);

/** Undyed thread is bought in white/black only; dyed colours are free-text on the stock row. */
export const threadBaseColorEnum = pgEnum("thread_base_color", ["White", "Black"]);

/**
 * Two stock pools, tracked in one ledger:
 *   primary   — undyed thread as purchased (e.g. 100 kg White 75D)
 *   secondary — dyed thread produced by the dyeing process (e.g. 20 kg Brown 22783 75D)
 */
export const threadStockTypeEnum = pgEnum("thread_stock_type", ["primary", "secondary"]);

/**
 * Every gram of thread moves through one of these. The movement table is append-only, so
 * the full history of any stock row can always be replayed.
 */
export const threadMovementTypeEnum = pgEnum("thread_movement_type", [
  "purchase_receipt", // primary stock credited from a receiving record
  "dye_consume", // primary stock debited by a dye batch
  "dye_produce", // secondary stock credited by a dye batch
  "production_issue", // stock debited by woven planning
  "production_release", // stock credited back when planning is changed or cancelled
  "adjustment", // manual correction
]);
