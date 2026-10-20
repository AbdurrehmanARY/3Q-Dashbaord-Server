import { pgTable } from "drizzle-orm/pg-core";

export type inferSelect<T extends typeof pgTable.prototype.$inferSelect> = T extends {
  $inferSelect: infer R;
}
  ? R
  : never;

export type inferInsert<T extends typeof pgTable.prototype.$inferInsert> = T extends {
  $inferInsert: infer R;
}
  ? R
  : never;
