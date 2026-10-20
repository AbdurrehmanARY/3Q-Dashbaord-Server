import { db } from "./index";
import { sql } from "drizzle-orm";

export async function migrateMachinesTable() {
  try {
    console.log("Ensuring machines table has product_type column…");
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'machines' AND column_name = 'product_type'
        ) THEN
          ALTER TABLE machines ADD COLUMN product_type operator_type DEFAULT 'both' NOT NULL;
        END IF;
      END $$;
    `);
    console.log("machines.product_type column verified/added successfully.");
  } catch (err) {
    console.error("Error migrating machines table product_type column:", err);
  }
}

// Run directly when executed via CLI
if (process.argv[1]?.includes("migrate-machines")) {
  migrateMachinesTable().then(() => process.exit(0));
}
