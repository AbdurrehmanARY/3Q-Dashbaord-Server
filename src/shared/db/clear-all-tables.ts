import { db } from "./index.js";
import { sql } from "drizzle-orm";

async function clearAll() {
  console.log("Truncating all operational and transactional database tables...");
  await db.execute(sql`
    TRUNCATE TABLE 
      production_roll_issuances,
      production_stage_events,
      production_order_lines,
      production_orders,
      woven_thread_plan_items,
      woven_production_lines,
      woven_work_order_details,
      work_orders,
      purchase_records,
      inventory_roll_movements,
      inventory_rolls,
      ink_consumptions,
      ink_purchases,
      thread_stock_movements,
      thread_dye_batches,
      thread_purchases,
      thread_stocks,
      thread_dyeing_receives,
      thread_dyeing_allocations,
      thread_dyeing_sends,
      thread_service_providers,
      production_runs,
      production_batches,
      production_stage_transactions,
      batch_consumptions,
      sticker_materials,
      local_sheets,
      label_sheets
    RESTART IDENTITY CASCADE;
  `);
  console.log("Done: All order, production, inventory, and purchase tables truncated successfully!");
  process.exit(0);
}

clearAll().catch((err) => {
  console.error("Failed to truncate tables:", err);
  process.exit(1);
});
