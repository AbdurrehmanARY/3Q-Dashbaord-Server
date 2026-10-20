import { Router } from "express";
import { workOrderController } from "./work-order.controller";
import { productionRunController } from "@modules/production/batch-and-runs/production-run.controller";
import { validateRequest, validateQuery, validateParams } from "@shared/middleware/validateRequest";
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  dispatchWorkOrderSchema,
} from "./work-order.schema";
import {
  createProductionRunSchema,
  saleOrderParamsSchema,
} from "@modules/production/batch-and-runs/production-run.schema";
import { listWorkOrdersQuerySchema } from "@shared/validation/query.schema";
import { idParamsSchema } from "@shared/validation/common.schema";

const router = Router();

router.get("/", validateQuery(listWorkOrdersQuerySchema), workOrderController.getWorkOrders);
router.post("/", validateRequest(createWorkOrderSchema), workOrderController.createWorkOrder);
router.get("/:id", validateParams(idParamsSchema), workOrderController.getWorkOrder);
router.put("/:id", validateParams(idParamsSchema), validateRequest(updateWorkOrderSchema), workOrderController.updateWorkOrder);
/* Dispatch completion — DC Number + LC Number are both required by the schema. */
router.post(
  "/:id/dispatch",
  validateParams(idParamsSchema),
  validateRequest(dispatchWorkOrderSchema),
  workOrderController.dispatchWorkOrder
);
router.delete("/:id", validateParams(idParamsSchema), workOrderController.deleteWorkOrder);

/* ---- Append-only production runs against a sale order ---- */
router.get(
  "/:saleOrderId/production-summary",
  validateParams(saleOrderParamsSchema),
  productionRunController.getSummary
);
router.post(
  "/:saleOrderId/production-runs",
  validateParams(saleOrderParamsSchema),
  validateRequest(createProductionRunSchema),
  productionRunController.logRun
);

export default router;
