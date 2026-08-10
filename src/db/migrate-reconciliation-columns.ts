import { db } from "./index";
import { sql } from "drizzle-orm";

export async function migrateReconciliationColumns() {
  try {
    console.log("Ensuring production_order_lines table has reconciliation columns…");
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'production_order_lines' AND column_name = 'used_rolls'
        ) THEN
          ALTER TABLE production_order_lines ADD COLUMN used_rolls numeric(10,2) DEFAULT '0' NOT NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'production_order_lines' AND column_name = 'used_weight'
        ) THEN
          ALTER TABLE production_order_lines ADD COLUMN used_weight numeric(14,4) DEFAULT '0' NOT NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'production_order_lines' AND column_name = 'extra_rolls_returned'
        ) THEN
          ALTER TABLE production_order_lines ADD COLUMN extra_rolls_returned numeric(10,2) DEFAULT '0' NOT NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'production_order_lines' AND column_name = 'extra_weight'
        ) THEN
          ALTER TABLE production_order_lines ADD COLUMN extra_weight numeric(14,4) DEFAULT '0' NOT NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'production_order_lines' AND column_name = 'reconciled_at'
        ) THEN
          ALTER TABLE production_order_lines ADD COLUMN reconciled_at timestamp;
        END IF;
      END $$;
    `);
    console.log("production_order_lines reconciliation columns verified/added successfully.");
  } catch (err) {
    console.error("Error migrating production_order_lines reconciliation columns:", err);
  }
}

// Run directly when executed via CLI
if (process.argv[1]?.includes("migrate-reconciliation-columns")) {
  migrateReconciliationColumns().then(() => process.exit(0));
}
