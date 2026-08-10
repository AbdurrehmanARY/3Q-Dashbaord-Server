import { pgTable, serial, integer, varchar, numeric, date, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { threadServiceProviders } from "./thread-service-providers.table";
import { threadDenierEnum, threadBaseColorEnum } from "./thread.enums";

/** Lifecycle of a thread-dyeing send: sent out → (partially) received back dyed. */
export const threadDyeingSendStatusEnum = pgEnum("thread_dyeing_send_status", [
  "sent",
  "partially_received",
  "received",
]);

/**
 * A batch of undyed thread sent to a service provider for dyeing. Creating one deducts the
 * sent weight from Undyed (primary) Thread Stock immediately. The sum of its allocations'
 * weights must equal `totalWeightSent` — enforced in the service.
 */
export const threadDyeingSends = pgTable(
  "thread_dyeing_sends",
  {
    id: serial("id").primaryKey(),
    serviceProviderId: integer("service_provider_id")
      .notNull()
      .references(() => threadServiceProviders.id),
    sendingDate: date("sending_date").notNull(),
    senderTrackingNumber: varchar("sender_tracking_number", { length: 100 }),
    denier: threadDenierEnum("denier").notNull(),
    baseThreadColor: threadBaseColorEnum("base_thread_color").notNull(),
    totalWeightSent: numeric("total_weight_sent", { precision: 14, scale: 3 }).notNull(),
    status: threadDyeingSendStatusEnum("status").default("sent").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    providerIdx: index("thread_dyeing_sends_provider_idx").on(table.serviceProviderId),
    dateIdx: index("thread_dyeing_sends_date_idx").on(table.sendingDate),
  })
);

/**
 * One target colour a send is split into. `SUM(allocatedWeight)` across a send must equal
 * the send's `totalWeightSent`. Each allocation becomes one Dyed (secondary) Thread Stock
 * row when the send is received.
 */
export const threadDyeingAllocations = pgTable(
  "thread_dyeing_allocations",
  {
    id: serial("id").primaryKey(),
    threadDyeingSendId: integer("thread_dyeing_send_id")
      .notNull()
      .references(() => threadDyeingSends.id, { onDelete: "cascade" }),
    colorName: varchar("color_name", { length: 100 }).notNull(),
    pantone: varchar("pantone", { length: 50 }),
    colorCode: varchar("color_code", { length: 50 }),
    /** Weight sent for this colour (the "before" weight). */
    allocatedWeight: numeric("allocated_weight", { precision: 14, scale: 3 }).notNull(),
    /** Actual dyed weight received back (the "after" weight). Set at receive time; this is
     *  what gets credited to dyed stock. Null until received. */
    receivedWeight: numeric("received_weight", { precision: 14, scale: 3 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    sendIdx: index("thread_dyeing_allocations_send_idx").on(table.threadDyeingSendId),
  })
);

/**
 * Receiving dyed thread back from the provider. Creating one credits Dyed (secondary)
 * Thread Stock — one row per allocation colour — and advances the send's status.
 */
export const threadDyeingReceives = pgTable(
  "thread_dyeing_receives",
  {
    id: serial("id").primaryKey(),
    threadDyeingSendId: integer("thread_dyeing_send_id")
      .notNull()
      .references(() => threadDyeingSends.id, { onDelete: "cascade" }),
    receivingDate: date("receiving_date").notNull(),
    receiverTrackingNumber: varchar("receiver_tracking_number", { length: 100 }),
    invoiceNumber: varchar("invoice_number", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    sendIdx: index("thread_dyeing_receives_send_idx").on(table.threadDyeingSendId),
  })
);
