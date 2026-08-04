import { pgEnum } from "drizzle-orm/pg-core";

/**
 * The facility now runs two independent manufacturing workflows off one sales order:
 *
 *   printed — Printing -> Cutting -> Packaging -> Dispatch   (satin, taffeta, …)
 *   woven   — Planning -> Weaving -> Cutting -> Packaging -> Dispatch
 *
 * This discriminator lives on `work_orders` and defaults to `printed`, so every row that
 * existed before the woven workflow keeps behaving exactly as it did.
 */
export const productTypeEnum = pgEnum("product_type", ["printed", "woven"]);
