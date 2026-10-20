import { pgTable, serial, varchar, timestamp, boolean, integer, text, index } from "drizzle-orm/pg-core";
import { users } from "./users.table";
import { operatorTypeEnum } from "./operator-type.enum";

export const operators = pgTable("operators", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  employeeCode: varchar("employee_code", { length: 100 }),
  /** Which stage they work: Printing / Cutting / Packaging. */
  designation: varchar("designation", { length: 50 }).notNull().default("Printing"),
  /**
   * Which product line they are trained for. Production pickers filter on this so a woven
   * job never offers a printed-only operator. Defaults to `both` — see the enum.
   */
  operatorType: operatorTypeEnum("operator_type").default("both").notNull(),
  /**
   * Avatar image URL. Plain text today (paste any URL); swapping in a Cloudinary-hosted URL
   * later needs no schema change — only the upload path that produces the URL.
   */
  avatarUrl: text("avatar_url"),
  shift: varchar("shift", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull().default("Active"),
  /** Optional link to the staff directory, so floor activity can be attributed to a user. */
  userId: integer("user_id").references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  operatorTypeIdx: index("operators_operator_type_idx").on(table.operatorType),
  designationIdx: index("operators_designation_idx").on(table.designation),
}));
