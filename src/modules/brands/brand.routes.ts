import { Router } from "express";
import { brandController } from "./brand.controller";
import { validateRequest, validateParams } from "@shared/middleware/validateRequest";
import { createBrandSchema, updateBrandSchema } from "./brand.schema";
import { idParamsSchema, companyIdParamsSchema } from "@shared/validation/common.schema";

const router = Router();

router.get("/", brandController.getBrands);
router.get("/:id", validateParams(idParamsSchema), brandController.getBrand);
router.get("/company/:companyId", validateParams(companyIdParamsSchema), brandController.getBrandsByCompany);
router.post("/", validateRequest(createBrandSchema), brandController.createBrand);
router.put("/:id", validateParams(idParamsSchema), validateRequest(updateBrandSchema), brandController.updateBrand);
router.delete("/:id", validateParams(idParamsSchema), brandController.deleteBrand);

export default router;
