import { pgTable, serial, varchar, text, timestamp, index } from "drizzle-orm/pg-core";

/**
 * External dyeing service providers thread is sent out to. Master data for the
 * thread-dyeing send/receive workflow.
 */
export const threadServiceProviders = pgTable(
  "thread_service_providers",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    contact: varchar("contact", { length: 100 }),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("thread_service_providers_name_idx").on(table.name),
  })
);
