import { Router } from "express";
import { brandController } from "@api/controllers/brand.controller";
import { validateRequest, validateParams } from "@api/middleware/validateRequest";
import { createBrandSchema, updateBrandSchema } from "@api/validations/brands.validation";
import { idParamsSchema, companyIdParamsSchema } from "@api/validations/common.validation";

const router = Router();

router.get("/", brandController.getBrands);
router.get("/:id", validateParams(idParamsSchema), brandController.getBrand);
router.get("/company/:companyId", validateParams(companyIdParamsSchema), brandController.getBrandsByCompany);
router.post("/", validateRequest(createBrandSchema), brandController.createBrand);
router.put("/:id", validateParams(idParamsSchema), validateRequest(updateBrandSchema), brandController.updateBrand);
router.delete("/:id", validateParams(idParamsSchema), brandController.deleteBrand);

export default router;
