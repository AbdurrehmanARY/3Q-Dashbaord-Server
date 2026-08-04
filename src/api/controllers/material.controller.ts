import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { materialService } from "../services/material.service";
import type { CreateMaterialDTO, UpdateMaterialDTO } from "../validations/materials.validation";
import type { ListMaterialsQueryDTO } from "../validations/query.validation";

class MaterialController {
  getMaterials = asyncHandler(async (req: Request, res: Response) => {
    const { type, includeInactive } = (req.validatedQuery ?? req.query) as ListMaterialsQueryDTO;
    const data = await materialService.getMaterials({ type, includeInactive });
    res.json({ data });
  });

  getMaterial = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await materialService.getMaterialById(id);
    res.json({ data });
  });

  createMaterial = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreateMaterialDTO;
    const data = await materialService.createMaterial(input);
    res.status(201).json({ data });
  });

  updateMaterial = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = (req.validatedParams ?? req.params) as { id: string };
      const body = (req.validatedBody ?? req.body) as UpdateMaterialDTO;
      const { code, ...data } = body;
      const updated = await materialService.updateMaterial(id, data);
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  });

  deleteMaterial = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await materialService.deleteMaterial(id);
    res.status(204).send();
  });
}

export const materialController = new MaterialController();
