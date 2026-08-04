import { pgTable, serial, integer, decimal, text, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { productionOrderLines } from "./production-order-lines.table";
import { users } from "./users.table";

export const productionEventTypeEnum = pgEnum("production_event_type", [
  "printing_progress",
  "transfer_to_cutting",
  "cutting_progress",
  "transfer_to_packaging",
  "packaging_progress",
  "assignment",
  "row_update",
]);

/**
 * Append-only audit of every movement on a production line — who changed which
 * counter, from what to what. Written in the same transaction as the counter
 * update so the log can never drift from the line it describes.
 */
export const productionStageEvents = pgTable(
  "production_stage_events",
  {
    id: serial("id").primaryKey(),
    productionOrderLineId: integer("production_order_line_id")
      .notNull()
      .references(() => productionOrderLines.id, { onDelete: "cascade" }),
    eventType: productionEventTypeEnum("event_type").notNull(),
    previousValue: decimal("previous_value", { precision: 12, scale: 2 }),
    newValue: decimal("new_value", { precision: 12, scale: 2 }),
    delta: decimal("delta", { precision: 12, scale: 2 }),
    actorUserId: integer("actor_user_id").references(() => users.id),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    lineIdx: index("production_stage_events_line_idx").on(table.productionOrderLineId),
    actorIdx: index("production_stage_events_actor_idx").on(table.actorUserId),
    createdAtIdx: index("production_stage_events_created_at_idx").on(table.createdAt),
  })
);
