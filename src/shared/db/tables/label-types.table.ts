import { pgTable, serial, varchar, boolean, timestamp, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Label types for production orders and batches.
 *
 * Each label type belongs to either the Woven or Printed workflow category.
 * The category determines which production stages the label type can flow through.
 *
 * Existing hardcoded label types are seeded in migration 0026.
 */
export const labelTypes = pgTable(
  "label_types",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 20 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("label_types_name_category_uq").on(table.name, table.category),
    check(
      "label_types_valid_category",
      sql`${table.category} IN ('woven', 'printed')`
    ),
  ]
);

export type LabelType = typeof labelTypes.$inferSelect;
export type NewLabelType = typeof labelTypes.$inferInsert;