import { pgTable, serial, varchar, date, integer, timestamp, unique, text, index, pgEnum } from "drizzle-orm/pg-core";
import { brands } from "./brands.table";
import { productTypeEnum } from "./product-type.enum";

/**
 * Work order status is **derived from the production order**, never set by hand:
 *
 *   no production order            -> initiate_production  (freely editable)
 *   production order planned|production -> production      (in flight)
 *   production order complete      -> complete             (locked)
 *
 * `dcNumber` / `dispatchedDate` are dispatch paperwork captured against a completed
 * order; they no longer gate the transition, because the transition is automatic.
 */
export const workOrderStatusEnum = pgEnum("work_order_status", [
  "initiate_production",
  "production",
  "complete",
  /**
   * Goods have left the facility. Reached only by recording the dispatch paperwork
   * (DC number, LC number and FBR invoice number) against a `complete` order — it is the
   * one status that dispatch, not production, decides. Terminal: production re-syncs never
   * downgrade a dispatched order.
   */
  "dispatched",
]);

export const workOrders = pgTable(
  "work_orders",
  {
    id: serial("id").primaryKey(),
    soNumber: varchar("so_number", { length: 100 }).notNull().unique(),
    poNumber: varchar("po_number", { length: 100 }),
    orderDate: date("order_date").notNull(),
    dueDate: date("due_date"),
    totalQty: integer("total_qty").notNull(),
    brandId: integer("brand_id").references(() => brands.id),
    comment: text("comment"),
    /**
     * Artwork / reference image for the order, rendered on the detail page. Plain URL text
     * today; a Cloudinary-hosted URL would drop in here unchanged.
     */
    imageUrl: text("image_url"),
    /**
     * DC-copy image captured alongside the artwork during dispatch (0028).
     * Same pattern as imageUrl: plain text holding a base64 data URI or URL.
     */
    dcImageUrl: text("dc_image_url"),
    status: workOrderStatusEnum("status").default("initiate_production").notNull(),
    /**
     * Scheduling priority, set by office staff on any order (woven or printed).
     * Stored as a plain varchar (not a pg enum) so the value set is easy to extend —
     * validated to `normal | urgent | emergency` by the Zod schema. Default `normal`.
     */
    priority: varchar("priority", { length: 20 }).default("normal").notNull(),
    /**
     * Why this order exists. Validated to
     * `normal order | shortfall | additional order | recut order`. Default `normal order`.
     */
    orderType: varchar("order_type", { length: 30 }).default("normal order").notNull(),
    /**
     * Which manufacturing workflow this order runs through. Defaults to `printed`, so every
     * pre-existing row keeps its current behaviour untouched. Woven orders additionally
     * carry a `woven_work_order_details` row with the loom specification.
     */
    productType: productTypeEnum("product_type").default("printed").notNull(),
    /** Dispatch chalan number — required to complete dispatch, and searchable. */
    dcNumber: varchar("dc_number", { length: 100 }),
    /** Letter-of-credit number — required to complete dispatch, and searchable. */
    lcNumber: varchar("lc_number", { length: 100 }),
    /** FBR (tax authority) invoice number — required to complete dispatch, and searchable. */
    fbrInvoiceNumber: varchar("fbr_invoice_number", { length: 100 }),
    /** Dispatch date — captured against a completed order. */
    dispatchedDate: date("dispatched_date"),
    /** Quantity actually dispatched; may differ from `totalQty` on a short shipment. */
    dispatchedQty: integer("dispatched_qty"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    soNumberIdx: unique("work_orders_so_number_idx").on(table.soNumber),
    brandIdx: index("work_orders_brand_idx").on(table.brandId),
    statusIdx: index("work_orders_status_idx").on(table.status),
    productTypeIdx: index("work_orders_product_type_idx").on(table.productType),
    // Dispatch paperwork is searchable, so both numbers get an index.
    dcNumberIdx: index("work_orders_dc_number_idx").on(table.dcNumber),
    lcNumberIdx: index("work_orders_lc_number_idx").on(table.lcNumber),
    fbrInvoiceIdx: index("work_orders_fbr_invoice_idx").on(table.fbrInvoiceNumber),
  })
);
