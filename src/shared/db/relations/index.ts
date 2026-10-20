import { relations } from "drizzle-orm";
import { companies } from "../tables/companies.table";
import { brands } from "../tables/brands.table";
import { workOrders } from "../tables/work-orders.table";
import { materials } from "../tables/materials.table";
import { machines } from "../tables/machines.table";
import { operators } from "../tables/operators.table";
import { inventoryRolls } from "../tables/inventory-rolls.table";
import { purchaseRecords } from "../tables/purchase-record.table";
import { users } from "../tables/users.table";
import { productionOrders } from "../tables/production-orders.table";
import { productionOrderLines } from "../tables/production-order-lines.table";
import { productionStageEvents } from "../tables/production-stage-events.table";
import { productionRollIssuances } from "../tables/production-roll-issuances.table";
import { productionBatches } from "../tables/production-batches.table";
import { productionStageTransactions } from "../tables/production-stage-transactions.table";
import { batchConsumptions } from "../tables/batch-consumptions.table";
import { wovenWorkOrderDetails } from "../tables/woven-work-order-details.table";
import { wovenProductionLines } from "../tables/woven-production-lines.table";
import { wovenThreadPlanItems } from "../tables/woven-thread-plan-items.table";
import { threadStocks } from "../tables/thread-stocks.table";
import { threadDyeBatches } from "../tables/thread-dye-batches.table";
import { threadStockMovements } from "../tables/thread-stock-movements.table";
import { productionRuns } from "../tables/production-runs.table";
import { threadServiceProviders } from "../tables/thread-service-providers.table";
import {
  threadDyeingSends,
  threadDyeingAllocations,
  threadDyeingReceives,
} from "../tables/thread-dyeing-workflow.table";

export const companiesRelations = relations(companies, ({ many }) => ({
  brands: many(brands),
}));

export const brandsRelations = relations(brands, ({ one, many }) => ({
  company: one(companies, {
    fields: [brands.companyId],
    references: [companies.id],
  }),
  workOrders: many(workOrders),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  brand: one(brands, {
    fields: [workOrders.brandId],
    references: [brands.id],
  }),
  productionOrders: many(productionOrders),
  /** Present only when `productType` is `woven`. */
  wovenDetail: one(wovenWorkOrderDetails, {
    fields: [workOrders.id],
    references: [wovenWorkOrderDetails.workOrderId],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  operators: many(operators),
  createdProductionOrders: many(productionOrders),
  stageEvents: many(productionStageEvents),
  rollIssuances: many(productionRollIssuances),
}));

export const productionOrdersRelations = relations(productionOrders, ({ one, many }) => ({
  workOrder: one(workOrders, {
    fields: [productionOrders.workOrderId],
    references: [workOrders.id],
  }),
  createdBy: one(users, {
    fields: [productionOrders.createdByUserId],
    references: [users.id],
  }),
  /** Printed-labels lines. Woven orders use `wovenLines` instead — never both. */
  lines: many(productionOrderLines),
  wovenLines: many(wovenProductionLines),
}));

export const productionOrderLinesRelations = relations(productionOrderLines, ({ one, many }) => ({
  productionOrder: one(productionOrders, {
    fields: [productionOrderLines.productionOrderId],
    references: [productionOrders.id],
  }),
  material: one(materials, {
    fields: [productionOrderLines.materialCode],
    references: [materials.code],
  }),
  printingMachine: one(machines, {
    fields: [productionOrderLines.printingMachineId],
    references: [machines.id],
    relationName: "linePrintingMachine",
  }),
  printingOperator: one(operators, {
    fields: [productionOrderLines.printingOperatorId],
    references: [operators.id],
    relationName: "linePrintingOperator",
  }),
  cuttingMachine: one(machines, {
    fields: [productionOrderLines.cuttingMachineId],
    references: [machines.id],
    relationName: "lineCuttingMachine",
  }),
  cuttingOperator: one(operators, {
    fields: [productionOrderLines.cuttingOperatorId],
    references: [operators.id],
    relationName: "lineCuttingOperator",
  }),
  packagingOperator: one(operators, {
    fields: [productionOrderLines.packagingOperatorId],
    references: [operators.id],
    relationName: "linePackagingOperator",
  }),
  stageEvents: many(productionStageEvents),
  rollIssuances: many(productionRollIssuances),
  batches: many(productionBatches),
  stageTransactions: many(productionStageTransactions),
  batchConsumptions: many(batchConsumptions),
}));

export const productionBatchesRelations = relations(productionBatches, ({ one, many }) => ({
  line: one(productionOrderLines, {
    fields: [productionBatches.productionOrderLineId],
    references: [productionOrderLines.id],
  }),
  machine: one(machines, {
    fields: [productionBatches.machineId],
    references: [machines.id],
  }),
  operator: one(operators, {
    fields: [productionBatches.operatorId],
    references: [operators.id],
  }),
  createdBy: one(users, {
    fields: [productionBatches.createdByUserId],
    references: [users.id],
  }),
  stageTransactions: many(productionStageTransactions),
  /** Edges where this batch is the DESTINATION — what it took from upstream. */
  consumesFrom: many(batchConsumptions, { relationName: "consumptionDestination" }),
  /** Edges where this batch is the SOURCE — where its output went. */
  consumedBy: many(batchConsumptions, { relationName: "consumptionSource" }),
}));

/**
 * The material-flow edge. Both sides point at `production_batches`, so each needs an
 * explicit `relationName` — without them Drizzle cannot tell which foreign key belongs to
 * which relation.
 */
export const batchConsumptionsRelations = relations(batchConsumptions, ({ one }) => ({
  destinationBatch: one(productionBatches, {
    fields: [batchConsumptions.destinationBatchId],
    references: [productionBatches.id],
    relationName: "consumptionDestination",
  }),
  sourceBatch: one(productionBatches, {
    fields: [batchConsumptions.sourceBatchId],
    references: [productionBatches.id],
    relationName: "consumptionSource",
  }),

  createdBy: one(users, {
    fields: [batchConsumptions.createdByUserId],
    references: [users.id],
  }),
}));

export const productionStageTransactionsRelations = relations(productionStageTransactions, ({ one }) => ({
  line: one(productionOrderLines, {
    fields: [productionStageTransactions.productionOrderLineId],
    references: [productionOrderLines.id],
  }),
  batch: one(productionBatches, {
    fields: [productionStageTransactions.batchId],
    references: [productionBatches.id],
  }),
  createdBy: one(users, {
    fields: [productionStageTransactions.createdByUserId],
    references: [users.id],
  }),
}));

export const productionStageEventsRelations = relations(productionStageEvents, ({ one }) => ({
  line: one(productionOrderLines, {
    fields: [productionStageEvents.productionOrderLineId],
    references: [productionOrderLines.id],
  }),
  actor: one(users, {
    fields: [productionStageEvents.actorUserId],
    references: [users.id],
  }),
}));

export const productionRollIssuancesRelations = relations(productionRollIssuances, ({ one }) => ({
  line: one(productionOrderLines, {
    fields: [productionRollIssuances.productionOrderLineId],
    references: [productionOrderLines.id],
  }),
  material: one(materials, {
    fields: [productionRollIssuances.materialCode],
    references: [materials.code],
  }),
  actor: one(users, {
    fields: [productionRollIssuances.actorUserId],
    references: [users.id],
  }),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  purchaseRecords: many(purchaseRecords),
  inventoryRolls: many(inventoryRolls),
  productionOrderLines: many(productionOrderLines),
  rollIssuances: many(productionRollIssuances),
}));

export const purchaseRecordsRelations = relations(purchaseRecords, ({ one }) => ({
  material: one(materials, {
    fields: [purchaseRecords.materialCode],
    references: [materials.code],
  }),
}));

export const inventoryRollsRelations = relations(inventoryRolls, ({ one }) => ({
  material: one(materials, {
    fields: [inventoryRolls.materialCode],
    references: [materials.code],
  }),
}));

export const machinesRelations = relations(machines, ({ one, many }) => ({
  operator: one(operators, {
    fields: [machines.machineOperatorId],
    references: [operators.id],
  }),
  cuttingLines: many(productionOrderLines, {
    relationName: "lineCuttingMachine",
  }),
  printingLines: many(productionOrderLines, {
    relationName: "linePrintingMachine",
  }),
  wovenWeavingLines: many(wovenProductionLines, { relationName: "wovenWeavingMachine" }),
}));

/* ==================== Woven Labels workflow ==================== */

export const wovenWorkOrderDetailsRelations = relations(wovenWorkOrderDetails, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [wovenWorkOrderDetails.workOrderId],
    references: [workOrders.id],
  }),
}));

export const wovenProductionLinesRelations = relations(wovenProductionLines, ({ one, many }) => ({
  productionOrder: one(productionOrders, {
    fields: [wovenProductionLines.productionOrderId],
    references: [productionOrders.id],
  }),
  threadPlanItems: many(wovenThreadPlanItems),
  /** Machine and operator live on these now, one pairing per batch. */
  batches: many(productionBatches),
  batchConsumptions: many(batchConsumptions),
}));

export const wovenThreadPlanItemsRelations = relations(wovenThreadPlanItems, ({ one }) => ({
  line: one(wovenProductionLines, {
    fields: [wovenThreadPlanItems.wovenProductionLineId],
    references: [wovenProductionLines.id],
  }),
  threadStock: one(threadStocks, {
    fields: [wovenThreadPlanItems.threadStockId],
    references: [threadStocks.id],
  }),
}));

/* ==================== Thread inventory ==================== */

export const threadStocksRelations = relations(threadStocks, ({ many }) => ({
  movements: many(threadStockMovements),
  planItems: many(wovenThreadPlanItems),
  dyedFrom: many(threadDyeBatches, { relationName: "dyeBatchFromStock" }),
  dyedInto: many(threadDyeBatches, { relationName: "dyeBatchToStock" }),
}));

export const threadStockMovementsRelations = relations(threadStockMovements, ({ one }) => ({
  stock: one(threadStocks, {
    fields: [threadStockMovements.threadStockId],
    references: [threadStocks.id],
  }),
  actor: one(users, {
    fields: [threadStockMovements.actorUserId],
    references: [users.id],
  }),
}));

export const threadDyeBatchesRelations = relations(threadDyeBatches, ({ one }) => ({
  fromStock: one(threadStocks, {
    fields: [threadDyeBatches.fromStockId],
    references: [threadStocks.id],
    relationName: "dyeBatchFromStock",
  }),
  toStock: one(threadStocks, {
    fields: [threadDyeBatches.toStockId],
    references: [threadStocks.id],
    relationName: "dyeBatchToStock",
  }),
  actor: one(users, {
    fields: [threadDyeBatches.actorUserId],
    references: [users.id],
  }),
}));

/* ==================== Append-only production runs ==================== */

export const productionRunsRelations = relations(productionRuns, ({ one }) => ({
  saleOrder: one(workOrders, {
    fields: [productionRuns.saleOrderId],
    references: [workOrders.id],
  }),
  machine: one(machines, {
    fields: [productionRuns.machineId],
    references: [machines.id],
  }),
  operator: one(operators, {
    fields: [productionRuns.operatorId],
    references: [operators.id],
  }),
  createdBy: one(users, {
    fields: [productionRuns.createdBy],
    references: [users.id],
  }),
}));

/* ==================== Thread dyeing service-provider workflow ==================== */

export const threadServiceProvidersRelations = relations(threadServiceProviders, ({ many }) => ({
  sends: many(threadDyeingSends),
}));

export const threadDyeingSendsRelations = relations(threadDyeingSends, ({ one, many }) => ({
  serviceProvider: one(threadServiceProviders, {
    fields: [threadDyeingSends.serviceProviderId],
    references: [threadServiceProviders.id],
  }),
  allocations: many(threadDyeingAllocations),
  receives: many(threadDyeingReceives),
}));

export const threadDyeingAllocationsRelations = relations(threadDyeingAllocations, ({ one }) => ({
  send: one(threadDyeingSends, {
    fields: [threadDyeingAllocations.threadDyeingSendId],
    references: [threadDyeingSends.id],
  }),
}));

export const threadDyeingReceivesRelations = relations(threadDyeingReceives, ({ one }) => ({
  send: one(threadDyeingSends, {
    fields: [threadDyeingReceives.threadDyeingSendId],
    references: [threadDyeingSends.id],
  }),
}));

export const operatorsRelations = relations(operators, ({ one, many }) => ({
  machines: many(machines),
  user: one(users, {
    fields: [operators.userId],
    references: [users.id],
  }),
  productionRuns: many(productionRuns),
  wovenWeavingLines: many(wovenProductionLines, { relationName: "wovenWeavingOperator" }),
  wovenCuttingLines: many(wovenProductionLines, { relationName: "wovenCuttingOperator" }),
  wovenPackagingLines: many(wovenProductionLines, { relationName: "wovenPackagingOperator" }),
  cuttingLines: many(productionOrderLines, {
    relationName: "lineCuttingOperator",
  }),
  printingLines: many(productionOrderLines, {
    relationName: "linePrintingOperator",
  }),
  packagingLines: many(productionOrderLines, {
    relationName: "linePackagingOperator",
  }),
}));
