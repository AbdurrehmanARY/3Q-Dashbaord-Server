import { pgTable, serial, varchar, timestamp, index, unique, integer } from "drizzle-orm/pg-core";
import { companies } from "./companies.table";

export const brands = pgTable(
  "brands",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index("brands_company_idx").on(table.companyId),
    companyNameIdx: unique("brands_company_name_idx").on(table.companyId, table.name),
  })
);
