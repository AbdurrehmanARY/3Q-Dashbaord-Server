import { db } from "./index";
import { sql } from "drizzle-orm";

export async function migrateRemainingWeightColumns() {
  try {
    console.log("Ensuring woven_thread_plan_items table has remaining_weight_kg columns…");
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'woven_thread_plan_items' AND column_name = 'remaining_weight_kg'
        ) THEN
          ALTER TABLE woven_thread_plan_items ADD COLUMN remaining_weight_kg numeric(14,3) DEFAULT '0' NOT NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'woven_thread_plan_items' AND column_name = 'actual_consumed_weight_kg'
        ) THEN
          ALTER TABLE woven_thread_plan_items ADD COLUMN actual_consumed_weight_kg numeric(14,3);
        END IF;
      END $$;
    `);
    console.log("woven_thread_plan_items remaining weight columns verified/added successfully.");
  } catch (err) {
    console.error("Error migrating woven_thread_plan_items remaining weight columns:", err);
  }
}

// Run directly when executed via CLI
if (process.argv[1]?.includes("migrate-remaining-weight")) {
  migrateRemainingWeightColumns().then(() => process.exit(0));
}
