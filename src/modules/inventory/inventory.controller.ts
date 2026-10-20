import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "@shared/errors/asyncHandler";
import { inventoryService } from "./inventory.service";
import type { CreatePurchaseDTO, UpdatePurchaseDTO } from "./inventory.schema";
import type { ListPurchasesQueryDTO, ListStockQueryDTO } from "@shared/validation/query.schema";

class InventoryController {
  createPurchase = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreatePurchaseDTO;
    const data = await inventoryService.createPurchase(input);
    res.status(201).json({ data });
  });

  getPurchase = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await inventoryService.getPurchase(id);
    res.json({ data });
  });

  updatePurchase = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = (req.validatedParams ?? req.params) as { id: string };
      const input = (req.validatedBody ?? req.body) as UpdatePurchaseDTO;
      const data = await inventoryService.updatePurchase(id, input);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });

  deletePurchase = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await inventoryService.deletePurchase(id);
    res.status(204).send();
  });

  getPurchases = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, vendor, materialCode } = (req.validatedQuery ?? req.query) as ListPurchasesQueryDTO;
    const data = await inventoryService.getPurchases({
      startDate,
      endDate,
      vendor,
      materialCode,
    });
    res.json({ data });
  });

  getStock = asyncHandler(async (req: Request, res: Response) => {
    const { materialCode, type } = (req.validatedQuery ?? req.query) as ListStockQueryDTO;
    const data = await inventoryService.getStock({
      materialCode,
      type,
    });
    res.json({ data });
  });
}

export const inventoryController = new InventoryController();
