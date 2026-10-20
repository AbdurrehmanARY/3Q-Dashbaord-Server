import { Router } from "express";
import { inventoryController } from "./inventory.controller";
import { validateRequest, validateQuery, validateParams } from "@shared/middleware/validateRequest";
import { createPurchaseSchema, updatePurchaseSchema } from "./inventory.schema";
import { listPurchasesQuerySchema, listStockQuerySchema } from "@shared/validation/query.schema";
import { idParamsSchema } from "@shared/validation/common.schema";
import inventoryRollRoutes from "./inventory-roll.routes";

const router = Router();

router.use("/rolls", inventoryRollRoutes);

router.post("/purchases", validateRequest(createPurchaseSchema), inventoryController.createPurchase);
router.get("/purchases", validateQuery(listPurchasesQuerySchema), inventoryController.getPurchases);
router.get("/purchases/:id", validateParams(idParamsSchema), inventoryController.getPurchase);
router.put("/purchases/:id", validateParams(idParamsSchema), validateRequest(updatePurchaseSchema), inventoryController.updatePurchase);
router.delete("/purchases/:id", validateParams(idParamsSchema), inventoryController.deletePurchase);
router.get("/stock", validateQuery(listStockQuerySchema), inventoryController.getStock);

export default router;
