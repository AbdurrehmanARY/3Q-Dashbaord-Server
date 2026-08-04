import { Router } from "express";
import { companyController } from "@api/controllers/company.controller";
import { validateRequest, validateQuery, validateParams } from "@api/middleware/validateRequest";
import { createCompanySchema, updateCompanySchema } from "@api/validations/companies.validation";
import { listCompaniesQuerySchema } from "@api/validations/query.validation";
import { idParamsSchema } from "@api/validations/common.validation";

const router = Router();

router.get("/", validateQuery(listCompaniesQuerySchema), companyController.getCompanies);
router.get("/:id", validateParams(idParamsSchema), companyController.getCompany);
router.post("/", validateRequest(createCompanySchema), companyController.createCompany);
router.put("/:id", validateParams(idParamsSchema), validateRequest(updateCompanySchema), companyController.updateCompany);
router.delete("/:id", validateParams(idParamsSchema), companyController.deleteCompany);

export default router;
