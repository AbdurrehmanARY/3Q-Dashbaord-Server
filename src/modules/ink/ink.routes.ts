import { Router } from "express";
import { inkController } from "./ink.controller";
import { validateRequest, validateParams } from "@shared/middleware/validateRequest";
import {
  createInkPurchaseSchema,
  updateInkPurchaseSchema,
  createInkConsumptionSchema,
} from "./ink.schema";
import { idParamsSchema } from "@shared/validation/common.schema";

/* Mounted at /api/ink — see routes/index.ts. */
const router = Router();

/* Purchases + derived stock */
router.get("/purchases", inkController.listPurchases);
router.post("/purchases", validateRequest(createInkPurchaseSchema), inkController.createPurchase);
router.put(
  "/purchases/:id",
  validateParams(idParamsSchema),
  validateRequest(updateInkPurchaseSchema),
  inkController.updatePurchase
);
router.delete("/purchases/:id", validateParams(idParamsSchema), inkController.removePurchase);

router.get("/stock", inkController.stock);

/* Consumption + history */
router.get("/consumptions", inkController.listConsumptions);
router.get("/consumptions/by-operator", inkController.byOperator);
router.post("/consumptions", validateRequest(createInkConsumptionSchema), inkController.createConsumption);
router.delete("/consumptions/:id", validateParams(idParamsSchema), inkController.removeConsumption);

export default router;
