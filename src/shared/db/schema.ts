export * from "./tables/companies.table";
export * from "./tables/brands.table";
export * from "./tables/materials.table";
export * from "./tables/machines.table";
export * from "./tables/operators.table";
export * from "./tables/users.table";
export * from "./tables/work-orders.table";
export * from "./tables/production-status.enum";
export * from "./tables/production-orders.table";
export * from "./tables/production-order-lines.table";
export * from "./tables/production-stage-events.table";
export * from "./tables/production-roll-issuances.table";
/* ---------- Batch-based production: batches + stage ledger ---------- */
export * from "./tables/production-batches.table";
export * from "./tables/production-stage-transactions.table";
export * from "./tables/batch-consumptions.table";
export * from "./tables/purchase-record.table";
export * from "./tables/inventory-rolls.table";
export * from "./tables/inventory-roll-movements.table";
/* ---------- Ink purchasing / stock / consumption ---------- */
export * from "./tables/ink-purchases.table";
export * from "./tables/ink-consumptions.table";
export * from "./tables/operator-type.enum";
/* ---------- Append-only production runs ---------- */
export * from "./tables/production-run-reason.enum";
export * from "./tables/production-runs.table";
/* ---------- Other material receipts ---------- */
export * from "./tables/sticker-materials.table";
export * from "./tables/local-sheets.table";
export * from "./tables/label-sheets.table";
/* ---------- Label Types (Master Data) ---------- */
export * from "./tables/label-types.table";
/* ---------- Woven Labels workflow ---------- */
export * from "./tables/product-type.enum";
export * from "./tables/woven-work-order-details.table";
export * from "./tables/woven-production-lines.table";
export * from "./tables/woven-thread-plan-items.table";
/* ---------- Thread inventory ---------- */
export * from "./tables/thread.enums";
export * from "./tables/thread-stocks.table";
export * from "./tables/thread-purchases.table";
export * from "./tables/thread-dye-batches.table";
export * from "./tables/thread-stock-movements.table";
/* ---------- Thread dyeing service-provider workflow ---------- */
export * from "./tables/thread-service-providers.table";
export * from "./tables/thread-dyeing-workflow.table";
export * from "./relations/index";

import { companies } from "./tables/companies.table";
import { brands } from "./tables/brands.table";
import { materials } from "./tables/materials.table";
import { machines } from "./tables/machines.table";
import { operators } from "./tables/operators.table";
import { users } from "./tables/users.table";
import { workOrders } from "./tables/work-orders.table";
import { productionOrders } from "./tables/production-orders.table";
import { productionOrderLines } from "./tables/production-order-lines.table";
import { productionStageEvents } from "./tables/production-stage-events.table";
import { productionRollIssuances } from "./tables/production-roll-issuances.table";
import { productionBatches } from "./tables/production-batches.table";
import { productionStageTransactions } from "./tables/production-stage-transactions.table";
import { batchConsumptions } from "./tables/batch-consumptions.table";
import { purchaseRecords } from "./tables/purchase-record.table";
import { inventoryRolls } from "./tables/inventory-rolls.table";
import { inventoryRollMovements } from "./tables/inventory-roll-movements.table";
import { inkPurchases } from "./tables/ink-purchases.table";
import { inkConsumptions } from "./tables/ink-consumptions.table";
import { wovenWorkOrderDetails } from "./tables/woven-work-order-details.table";
import { wovenProductionLines } from "./tables/woven-production-lines.table";
import { wovenThreadPlanItems } from "./tables/woven-thread-plan-items.table";
import { threadStocks } from "./tables/thread-stocks.table";
import { threadPurchases } from "./tables/thread-purchases.table";
import { threadDyeBatches } from "./tables/thread-dye-batches.table";
import { threadStockMovements } from "./tables/thread-stock-movements.table";
import { productionRuns } from "./tables/production-runs.table";
import { stickerMaterials } from "./tables/sticker-materials.table";
import { localSheets } from "./tables/local-sheets.table";
import { labelSheets } from "./tables/label-sheets.table";
import { labelTypes } from "./tables/label-types.table";
import { threadServiceProviders } from "./tables/thread-service-providers.table";
import {
  threadDyeingSends,
  threadDyeingAllocations,
  threadDyeingReceives,
} from "./tables/thread-dyeing-workflow.table";

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
export type Machine = typeof machines.$inferSelect;
export type NewMachine = typeof machines.$inferInsert;
export type Operator = typeof operators.$inferSelect;
export type NewOperator = typeof operators.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type WorkOrder = typeof workOrders.$inferSelect;
export type NewWorkOrder = typeof workOrders.$inferInsert;
export type ProductionOrder = typeof productionOrders.$inferSelect;
export type NewProductionOrder = typeof productionOrders.$inferInsert;
export type ProductionOrderLine = typeof productionOrderLines.$inferSelect;
export type NewProductionOrderLine = typeof productionOrderLines.$inferInsert;
export type ProductionStageEvent = typeof productionStageEvents.$inferSelect;
export type NewProductionStageEvent = typeof productionStageEvents.$inferInsert;
export type ProductionBatch = typeof productionBatches.$inferSelect;
export type NewProductionBatch = typeof productionBatches.$inferInsert;
export type BatchConsumption = typeof batchConsumptions.$inferSelect;
export type NewBatchConsumption = typeof batchConsumptions.$inferInsert;
export type ProductionStageTransaction = typeof productionStageTransactions.$inferSelect;
export type NewProductionStageTransaction = typeof productionStageTransactions.$inferInsert;
export type ProductionRollIssuance = typeof productionRollIssuances.$inferSelect;
export type NewProductionRollIssuance = typeof productionRollIssuances.$inferInsert;
export type PurchaseRecord = typeof purchaseRecords.$inferSelect;
export type NewPurchaseRecord = typeof purchaseRecords.$inferInsert;
export type InventoryRoll = typeof inventoryRolls.$inferSelect;
export type NewInventoryRoll = typeof inventoryRolls.$inferInsert;
export type InventoryRollMovement = typeof inventoryRollMovements.$inferSelect;
export type NewInventoryRollMovement = typeof inventoryRollMovements.$inferInsert;
export type InkPurchase = typeof inkPurchases.$inferSelect;
export type NewInkPurchase = typeof inkPurchases.$inferInsert;
export type InkConsumption = typeof inkConsumptions.$inferSelect;
export type NewInkConsumption = typeof inkConsumptions.$inferInsert;

/* ---------- Woven Labels workflow ---------- */
export type WovenWorkOrderDetail = typeof wovenWorkOrderDetails.$inferSelect;
export type NewWovenWorkOrderDetail = typeof wovenWorkOrderDetails.$inferInsert;
export type WovenProductionLine = typeof wovenProductionLines.$inferSelect;
export type NewWovenProductionLine = typeof wovenProductionLines.$inferInsert;
export type WovenThreadPlanItem = typeof wovenThreadPlanItems.$inferSelect;
export type NewWovenThreadPlanItem = typeof wovenThreadPlanItems.$inferInsert;

/* ---------- Thread inventory ---------- */
export type ThreadStock = typeof threadStocks.$inferSelect;
export type NewThreadStock = typeof threadStocks.$inferInsert;
export type ThreadPurchase = typeof threadPurchases.$inferSelect;
export type NewThreadPurchase = typeof threadPurchases.$inferInsert;
export type ThreadDyeBatch = typeof threadDyeBatches.$inferSelect;
export type NewThreadDyeBatch = typeof threadDyeBatches.$inferInsert;
export type ThreadStockMovement = typeof threadStockMovements.$inferSelect;
export type NewThreadStockMovement = typeof threadStockMovements.$inferInsert;

/* ---------- Append-only production runs ---------- */
export type ProductionRun = typeof productionRuns.$inferSelect;
export type NewProductionRun = typeof productionRuns.$inferInsert;

/* ---------- Other material receipts ---------- */
export type StickerMaterial = typeof stickerMaterials.$inferSelect;
export type NewStickerMaterial = typeof stickerMaterials.$inferInsert;
export type LocalSheet = typeof localSheets.$inferSelect;
export type NewLocalSheet = typeof localSheets.$inferInsert;
export type LabelSheet = typeof labelSheets.$inferSelect;
export type NewLabelSheet = typeof labelSheets.$inferInsert;

/* ---------- Thread dyeing service-provider workflow ---------- */
export type ThreadServiceProvider = typeof threadServiceProviders.$inferSelect;
export type NewThreadServiceProvider = typeof threadServiceProviders.$inferInsert;
export type ThreadDyeingSend = typeof threadDyeingSends.$inferSelect;
export type NewThreadDyeingSend = typeof threadDyeingSends.$inferInsert;
export type ThreadDyeingAllocation = typeof threadDyeingAllocations.$inferSelect;
export type NewThreadDyeingAllocation = typeof threadDyeingAllocations.$inferInsert;
export type ThreadDyeingReceive = typeof threadDyeingReceives.$inferSelect;
export type NewThreadDyeingReceive = typeof threadDyeingReceives.$inferInsert;

/* ---------- Label Types (Master Data) ---------- */
export type LabelType = typeof labelTypes.$inferSelect;
export type NewLabelType = typeof labelTypes.$inferInsert;
