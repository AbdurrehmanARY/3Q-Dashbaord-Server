import { pgTable, serial, integer, varchar, decimal, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { inventoryRolls } from "./inventory-rolls.table";
import { users } from "./users.table";

/**
 * Why a roll ledger moved. Mirrors `thread_movement_type` so both inventories read the same
 * way, with the roll-specific sources (purchases credit, production issuance debits).
 */
export const rollMovementTypeEnum = pgEnum("roll_movement_type", [
  "opening_balance", // ledger created with an opening stock
  "purchase_receipt", // credited by a purchase record
  "purchase_reversal", // purchase edited down or deleted
  "production_issue", // debited by production planning / issuance
  "production_release", // credited back when a plan is changed or cancelled
  "adjustment", // manual correction from the stock screen
]);

/**
 * Append-only history behind `inventory_rolls.balanceRolls` — the roll-side counterpart to
 * `thread_stock_movements`.
 *
 * `rolls` is **signed**: positive credits the ledger, negative debits it. Each row is
 * written in the same transaction as the balance change it explains, so summing the
 * movements always reproduces the balance. Nothing is ever deleted; corrections are new
 * `adjustment` rows.
 */
export const inventoryRollMovements = pgTable(
  "inventory_roll_movements",
  {
    id: serial("id").primaryKey(),
    inventoryRollId: integer("inventory_roll_id")
      .notNull()
      .references(() => inventoryRolls.id, { onDelete: "cascade" }),
    /** Denormalised so history stays readable even if the ledger row is later removed. */
    materialCode: varchar("material_code", { length: 100 }).notNull(),
    movementType: rollMovementTypeEnum("movement_type").notNull(),
    /** Signed: + credits the ledger, - debits it. */
    rolls: decimal("rolls", { precision: 12, scale: 2 }).notNull(),
    /** Balance immediately after this movement — makes the history readable on its own. */
    balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
    referenceType: varchar("reference_type", { length: 50 }),
    referenceId: integer("reference_id"),
    note: varchar("note", { length: 500 }),
    actorUserId: integer("actor_user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    rollIdx: index("inventory_roll_movements_roll_idx").on(table.inventoryRollId),
    materialIdx: index("inventory_roll_movements_material_idx").on(table.materialCode),
    createdIdx: index("inventory_roll_movements_created_idx").on(table.createdAt),
  })
);
