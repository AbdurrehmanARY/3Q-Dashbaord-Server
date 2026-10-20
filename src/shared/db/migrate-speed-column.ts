import { db } from "./index";
import { sql } from "drizzle-orm";

export async function migrateSpeedColumn() {
  try {
    console.log("Ensuring woven_work_order_details table has speed column…");
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'woven_work_order_details' AND column_name = 'speed'
        ) THEN
          ALTER TABLE woven_work_order_details ADD COLUMN speed numeric(12,2) DEFAULT '600' NOT NULL;
        END IF;

        UPDATE woven_work_order_details SET speed = 600 WHERE speed = 0 OR speed IS NULL;
      END $$;
    `);
    console.log("woven_work_order_details speed column verified/updated successfully.");
  } catch (err) {
    console.error("Error migrating woven_work_order_details speed column:", err);
  }
}

if (process.argv[1]?.includes("migrate-speed-column")) {
  migrateSpeedColumn().then(() => process.exit(0));
}
