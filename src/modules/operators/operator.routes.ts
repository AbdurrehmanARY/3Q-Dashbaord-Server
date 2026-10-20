import { Router } from "express";
import { operatorController } from "./operator.controller";
import { validateRequest, validateQuery, validateParams } from "@shared/middleware/validateRequest";
import { createOperatorSchema, updateOperatorSchema } from "./operator.schema";
import { listOperatorsQuerySchema } from "@shared/validation/query.schema";
import { idParamsSchema } from "@shared/validation/common.schema";

const router = Router();

router.get("/", validateQuery(listOperatorsQuerySchema), operatorController.getOperators);
router.get("/:id", validateParams(idParamsSchema), operatorController.getOperator);
router.post("/", validateRequest(createOperatorSchema), operatorController.createOperator);
router.put("/:id", validateParams(idParamsSchema), validateRequest(updateOperatorSchema), operatorController.updateOperator);
router.delete("/:id", validateParams(idParamsSchema), operatorController.deleteOperator);

export default router;
