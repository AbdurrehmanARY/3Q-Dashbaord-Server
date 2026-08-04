import { Router } from "express";
import { inventoryRollController } from "@api/controllers/inventory-roll.controller";
import { validateRequest, validateParams, validateQuery } from "@api/middleware/validateRequest";
import {
  createInventoryRollSchema,
  updateInventoryRollSchema,
  inventoryRollParamsSchema,
  listInventoryRollsQuerySchema,
  listRollMovementsQuerySchema,
} from "@api/validations/inventory-roll.validation";

const router = Router();

/* Search / filter / sort / paging all live on the list query. */
router.get("/", validateQuery(listInventoryRollsQuerySchema), inventoryRollController.getInventoryRolls);
/* Declared before "/:materialCode" so it isn't swallowed by it. */
router.get(
  "/movements",
  validateQuery(listRollMovementsQuerySchema),
  inventoryRollController.getMovements
);
router.post("/", validateRequest(createInventoryRollSchema), inventoryRollController.createInventoryRoll);
router.get(
  "/:materialCode",
  validateParams(inventoryRollParamsSchema),
  inventoryRollController.getInventoryRollByMaterialCode
);
router.put(
  "/:materialCode",
  validateParams(inventoryRollParamsSchema),
  validateRequest(updateInventoryRollSchema),
  inventoryRollController.updateInventoryRoll
);
router.delete(
  "/:materialCode",
  validateParams(inventoryRollParamsSchema),
  inventoryRollController.deleteInventoryRoll
);

export default router;
