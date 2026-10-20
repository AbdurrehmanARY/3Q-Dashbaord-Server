import { Request, Response } from "express";
import { asyncHandler } from "@shared/errors/asyncHandler";
import { labelTypesService } from "./label-types.service";

class LabelTypesController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      category: req.validatedQuery?.category,
      activeOnly: req.validatedQuery?.activeOnly,
    };
    res.json({ data: await labelTypesService.getAll(filters) });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    res.json({ data: await labelTypesService.getById(id) });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as Parameters<typeof labelTypesService.create>[0];
    res.status(201).json({ data: await labelTypesService.create(input) });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as Parameters<typeof labelTypesService.update>[1];
    res.json({ data: await labelTypesService.update(id, input) });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await labelTypesService.delete(id);
    res.status(204).send();
  });
}

export const labelTypesController = new LabelTypesController();