import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { brandService } from "../services/company.service";
import type { CreateBrandDTO, UpdateBrandDTO } from "../validations/brands.validation";

class BrandController {
  getBrands = asyncHandler(async (req: Request, res: Response) => {
    const data = await brandService.getBrands();
    res.json({ data });
  });

  getBrand = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await brandService.getBrand(id);
    res.json({ data });
  });

  getBrandsByCompany = asyncHandler(async (req: Request, res: Response) => {
    const { companyId } = (req.validatedParams ?? req.params) as { companyId: string };
    const data = await brandService.getBrandsByCompany(companyId);
    res.json({ data });
  });

  createBrand = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreateBrandDTO;
    const data = await brandService.createBrand(input);
    res.status(201).json({ data });
  });

  updateBrand = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = (req.validatedParams ?? req.params) as { id: string };
      const input = (req.validatedBody ?? req.body) as UpdateBrandDTO;
      const data = await brandService.updateBrand(id, input);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });

  deleteBrand = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await brandService.deleteBrand(id);
    res.status(204).send();
  });
}

export const brandController = new BrandController();
