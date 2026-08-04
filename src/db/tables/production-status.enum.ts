import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Status of a single production line (one label type within a production order).
 * `paused` and `cancelled` are set explicitly and are never re-derived from counters.
 */
export const productionStatusEnum = pgEnum("production_status", [
  "pending",
  "active",
  "paused",
  "completed",
  "cancelled",
]);
