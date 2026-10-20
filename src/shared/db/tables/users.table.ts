import { pgTable, serial, varchar, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";

/**
 * The three production workflow roles. Packaging is performed by a
 * `production_operator` — there is deliberately no packaging-specific role.
 */
export const userRoleEnum = pgEnum("user_role", [
  "office_staff",
  "production_manager",
  "production_operator",
]);

/**
 * Staff directory used for attribution ("who did what") on production events.
 * There is no authentication in this system — the acting user is selected
 * explicitly by the client and sent as `actorUserId`.
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    employeeCode: varchar("employee_code", { length: 100 }),
    email: varchar("email", { length: 255 }).unique(),
    role: userRoleEnum("role").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    roleIdx: index("users_role_idx").on(table.role),
  })
);
