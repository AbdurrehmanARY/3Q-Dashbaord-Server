import { Router } from "express";
import { workOrderController } from "@api/controllers/work-order.controller";
import { validateRequest, validateQuery, validateParams } from "@api/middleware/validateRequest";
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  dispatchWorkOrderSchema,
} from "@api/validations/work-orders.validation";
import { listWorkOrdersQuerySchema } from "@api/validations/query.validation";
import { idParamsSchema } from "@api/validations/common.validation";

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

export default router;
