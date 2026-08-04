import { Router } from "express";
import { productionOrderController } from "@api/controllers/production-order.controller";
import { validateRequest, validateQuery, validateParams } from "@api/middleware/validateRequest";
import {
  createProductionOrderSchema,
  updateProductionOrderSchema,
  planLineRequestSchema,
  assignLineResourcesSchema,
  updateStageProgressSchema,
  transferRollsSchema,
  issueRollsSchema,
  updateLineFullSchema,
} from "@api/validations/production-orders.validation";
import { listProductionOrdersQuerySchema } from "@api/validations/query.validation";
import { idParamsSchema, lineIdParamsSchema, paginationQuerySchema } from "@api/validations/common.validation";

const router = Router();

/* --- Phase 1: Office Staff --- */
router.get("/", validateQuery(listProductionOrdersQuerySchema), productionOrderController.getProductionOrders);
router.get("/eligible-sales-orders", productionOrderController.getEligibleSalesOrders);
/* Machines/operators free to be assigned — declared before "/:id" so it isn't swallowed by it. */
router.get("/available-resources", productionOrderController.getAvailableResources);
router.post("/", validateRequest(createProductionOrderSchema), productionOrderController.createProductionOrder);

/* --- Order reads --- */
router.get("/:id", validateParams(idParamsSchema), productionOrderController.getProductionOrder);
router.get("/:id/overview", validateParams(idParamsSchema), productionOrderController.getProductionOrderOverview);
router.get("/:id/events", validateParams(idParamsSchema), validateQuery(paginationQuerySchema), productionOrderController.getOrderEvents);
router.patch("/:id", validateParams(idParamsSchema), validateRequest(updateProductionOrderSchema), productionOrderController.updateProductionOrder);
router.delete("/:id", validateParams(idParamsSchema), productionOrderController.deleteProductionOrder);

/* --- Phase 2: planning, one label type at a time. Submitting reserves its material,
       printing machine and printing operator until it completes or is cancelled. --- */
router.post("/:id/lines", validateParams(idParamsSchema), validateRequest(planLineRequestSchema), productionOrderController.planLine);
router.put("/lines/:lineId/plan", validateParams(lineIdParamsSchema), validateRequest(planLineRequestSchema), productionOrderController.updateLinePlan);
router.delete("/lines/:lineId", validateParams(lineIdParamsSchema), productionOrderController.deleteLine);

/* --- Inline row edit: the Production Progress table on the dashboard --- */
router.patch(
  "/lines/:lineId",
  validateParams(lineIdParamsSchema),
  validateRequest(updateLineFullSchema),
  productionOrderController.updateLineFull
);

/* --- Phases 4, 6 & 8: assignment and cumulative progress --- */
router.patch(
  "/lines/:lineId/assign",
  validateParams(lineIdParamsSchema),
  validateRequest(assignLineResourcesSchema),
  productionOrderController.assignLineResources
);
router.patch(
  "/lines/:lineId/printing",
  validateParams(lineIdParamsSchema),
  validateRequest(updateStageProgressSchema),
  productionOrderController.updatePrintingProgress
);
router.patch(
  "/lines/:lineId/cutting",
  validateParams(lineIdParamsSchema),
  validateRequest(updateStageProgressSchema),
  productionOrderController.updateCuttingProgress
);
router.patch(
  "/lines/:lineId/packaging",
  validateParams(lineIdParamsSchema),
  validateRequest(updateStageProgressSchema),
  productionOrderController.updatePackagingProgress
);

/* --- Phases 5 & 7: manual transfers between stages --- */
router.post("/lines/:lineId/transfers", validateParams(lineIdParamsSchema), validateRequest(transferRollsSchema), productionOrderController.transferRolls);

/* --- Material issuance from inventory (the only path that debits stock) --- */
router.post("/lines/:lineId/issuances", validateParams(lineIdParamsSchema), validateRequest(issueRollsSchema), productionOrderController.issueRolls);
router.get("/lines/:lineId/issuances", validateParams(lineIdParamsSchema), validateQuery(paginationQuerySchema), productionOrderController.getLineIssuances);

router.get("/lines/:lineId/events", validateParams(lineIdParamsSchema), validateQuery(paginationQuerySchema), productionOrderController.getLineEvents);

export default router;
