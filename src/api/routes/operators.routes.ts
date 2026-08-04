import { Router } from "express";
import { operatorController } from "@api/controllers/operator.controller";
import { validateRequest, validateQuery, validateParams } from "@api/middleware/validateRequest";
import { createOperatorSchema, updateOperatorSchema } from "@api/validations/operators.validation";
import { listOperatorsQuerySchema } from "@api/validations/query.validation";
import { idParamsSchema } from "@api/validations/common.validation";

const router = Router();

router.get("/", validateQuery(listOperatorsQuerySchema), operatorController.getOperators);
router.get("/:id", validateParams(idParamsSchema), operatorController.getOperator);
router.post("/", validateRequest(createOperatorSchema), operatorController.createOperator);
router.put("/:id", validateParams(idParamsSchema), validateRequest(updateOperatorSchema), operatorController.updateOperator);
router.delete("/:id", validateParams(idParamsSchema), operatorController.deleteOperator);

export default router;
