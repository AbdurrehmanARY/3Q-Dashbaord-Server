import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "@shared/errors/asyncHandler";
import { companyService } from "./company.service";
import { CreateCompanyDTO, UpdateCompanyDTO } from "./company.schema";

class CompanyController {
  getCompanies = asyncHandler(async (req: Request, res: Response) => {
    const { includeInactive } = (req.validatedQuery ?? req.query) as { includeInactive?: boolean };
    const data = await companyService.getCompanies({ includeInactive });
    res.json({ data });
  });

  getCompany = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await companyService.getCompanyById(id);
    res.json({ data });
  });

  createCompany = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validatedBody as CreateCompanyDTO;
    const data = await companyService.createCompany(body);
    res.status(201).json({ data });
  });

  updateCompany = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const body = req.validatedBody as UpdateCompanyDTO;
    const data = await companyService.updateCompany(id, body);
    res.json({ data });
  });

  deleteCompany = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await companyService.deleteCompany(id);
    res.status(204).send();
  });
}

export const companyController = new CompanyController();
