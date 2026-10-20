import { Router } from "express";
import { labelTypesController } from "./label-types.controller";
import { validateRequest, validateQuery, validateParams } from "@shared/middleware/validateRequest";
import {
  createLabelTypeSchema,
  updateLabelTypeSchema,
  labelTypeParamsSchema,
  labelTypesQuerySchema,
} from "./label-types.schema";

const router = Router();

/** Label Type Master Data CRUD */
router.get("/", validateQuery(labelTypesQuerySchema), labelTypesController.getAll);
router.get("/:id", validateParams(labelTypeParamsSchema), labelTypesController.getById);
router.post("/", validateRequest(createLabelTypeSchema), labelTypesController.create);
router.put("/:id", validateParams(labelTypeParamsSchema), validateRequest(updateLabelTypeSchema), labelTypesController.update);
router.delete("/:id", validateParams(labelTypeParamsSchema), labelTypesController.delete);

export default router;