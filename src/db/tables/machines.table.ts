import { pgTable, serial, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { operators } from "./operators.table";
import { operatorTypeEnum } from "./operator-type.enum";

export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  machineCode: varchar("machine_code", { length: 100 }).notNull().unique(),
  machineOperatorId: integer("machine_operator_id").references(() => operators.id),
  machineType: varchar("machine_type", { length: 50 }).notNull().default("Other"),
  /** Which product line the machine is built for: printed / woven / both. Defaults to `both`. */
  productType: operatorTypeEnum("product_type").default("both").notNull(),
  machineName: varchar("machine_name", { length: 255 }).notNull(),
  capacityPerHour: integer("capacity_per_hour"),
  status: varchar("status", { length: 50 }).notNull().default("Active"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
