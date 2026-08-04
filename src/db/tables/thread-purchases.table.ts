import { pgTable, serial, varchar, integer, numeric, date, timestamp, index } from "drizzle-orm/pg-core";
import { threadDenierEnum, threadBaseColorEnum } from "./thread.enums";

/**
 * Thread receiving. Mirrors the printed side's `purchase_records` in spirit: creating one
 * immediately credits primary (undyed) stock — there is no approval step — and editing or
 * deleting it reconciles that credit transactionally.
 *
 * `totalWeightKg` is **always server-calculated** as `weightPerCtnKg * totalCtns`; a client
 * that sends it has the value ignored, exactly like the printed purchase formulas.
 */
export const threadPurchases = pgTable(
  "thread_purchases",
  {
    id: serial("id").primaryKey(),
    receivedDate: date("received_date").notNull(),
    /** Always "Thread" today; kept explicit so other raw items can join this table later. */
    itemName: varchar("item_name", { length: 100 }).default("Thread").notNull(),
    /** The item code IS the denier — 45 / 75 / 100 / 150. */
    denier: threadDenierEnum("denier").notNull(),
    threadColor: threadBaseColorEnum("thread_color").notNull(),
    vendor: varchar("vendor", { length: 255 }).notNull(),
    invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
    /** Cartons received. */
    totalCtns: integer("total_ctns").notNull(),
    /** Weight of a single carton, in kg. */
    weightPerCtnKg: numeric("weight_per_ctn_kg", { precision: 12, scale: 3 }).notNull(),
    /** Server-calculated: weightPerCtnKg * totalCtns. */
    totalWeightKg: numeric("total_weight_kg", { precision: 14, scale: 3 }).notNull(),
    notes: varchar("notes", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    vendorIdx: index("thread_purchases_vendor_idx").on(table.vendor),
    invoiceIdx: index("thread_purchases_invoice_idx").on(table.invoiceNumber),
    dateIdx: index("thread_purchases_date_idx").on(table.receivedDate),
  })
);
