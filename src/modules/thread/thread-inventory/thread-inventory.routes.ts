import { Router } from "express";
import { threadInventoryController } from "./thread-inventory.controller";
import { validateRequest, validateQuery, validateParams } from "@shared/middleware/validateRequest";
import {
  createThreadPurchaseSchema,
  createDyeBatchSchema,
  createThreadStockSchema,
  updateThreadStockSchema,
  listThreadStocksQuerySchema,
  listThreadPurchasesQuerySchema,
  listThreadMovementsQuerySchema,
} from "./thread-inventory.schema";
import { idParamsSchema } from "@shared/validation/common.schema";

const router = Router();

/* --- Stock: primary (undyed) + secondary (dyed) --- */
router.get("/stocks", validateQuery(listThreadStocksQuerySchema), threadInventoryController.getStocks);
router.get("/stocks/summary", threadInventoryController.getStockSummary);
router.post("/stocks", validateRequest(createThreadStockSchema), threadInventoryController.createStock);
router.put(
  "/stocks/:id",
  validateParams(idParamsSchema),
  validateRequest(updateThreadStockSchema),
  threadInventoryController.updateStock
);
router.delete("/stocks/:id", validateParams(idParamsSchema), threadInventoryController.deleteStock);
router.get(
  "/movements",
  validateQuery(listThreadMovementsQuerySchema),
  threadInventoryController.getMovements
);

/* --- Receiving --- */
router.get(
  "/purchases",
  validateQuery(listThreadPurchasesQuerySchema),
  threadInventoryController.getPurchases
);
router.post(
  "/purchases",
  validateRequest(createThreadPurchaseSchema),
  threadInventoryController.createPurchase
);
router.delete(
  "/purchases/:id",
  validateParams(idParamsSchema),
  threadInventoryController.deletePurchase
);

/* --- Dyeing: primary -> secondary conversion --- */
router.get("/dye-batches", threadInventoryController.getDyeBatches);
router.post("/dye-batches", validateRequest(createDyeBatchSchema), threadInventoryController.createDyeBatch);

export default router;
