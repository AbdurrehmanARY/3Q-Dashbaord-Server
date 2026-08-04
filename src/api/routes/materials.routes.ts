import { Router } from "express";
import { materialController } from "@api/controllers/material.controller";
import { validateRequest, validateQuery, validateParams } from "@api/middleware/validateRequest";
import { createMaterialSchema, updateMaterialSchema } from "@api/validations/materials.validation";
import { listMaterialsQuerySchema } from "@api/validations/query.validation";
import { idParamsSchema } from "@api/validations/common.validation";

const router = Router();

router.get("/", validateQuery(listMaterialsQuerySchema), materialController.getMaterials);
router.get("/:id", validateParams(idParamsSchema), materialController.getMaterial);
router.post("/", validateRequest(createMaterialSchema), materialController.createMaterial);
router.put("/:id", validateParams(idParamsSchema), validateRequest(updateMaterialSchema), materialController.updateMaterial);
router.delete("/:id", validateParams(idParamsSchema), materialController.deleteMaterial);

export default router;
