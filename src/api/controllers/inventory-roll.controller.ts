import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { inventoryRollService } from "../services/inventory-roll.service";
import type { CreateInventoryRollDTO, UpdateInventoryRollDTO } from "../validations/inventory-roll.validation";

class InventoryRollController {
  /**
   * Returns `{ data, meta }`: the rows plus the unfiltered total, so the client can page
   * without a second request. `data` stays a plain array, matching every other list.
   */
  getInventoryRolls = asyncHandler(async (req: Request, res: Response) => {
    const query = (req.validatedQuery ?? req.query) as Parameters<
      typeof inventoryRollService.getInventoryRolls
    >[0];
    const { items, total } = await inventoryRollService.getInventoryRolls(query);
    res.json({ data: items, meta: { total, limit: query?.limit, offset: query?.offset } });
  });

  getMovements = asyncHandler(async (req: Request, res: Response) => {
    const { materialCode, limit } = (req.validatedQuery ?? req.query) as {
      materialCode?: string;
      limit?: number;
    };
    const data = await inventoryRollService.getMovements(materialCode, limit);
    res.json({ data });
  });

  getInventoryRollByMaterialCode = asyncHandler(async (req: Request, res: Response) => {
    const { materialCode } = (req.validatedParams ?? req.params) as { materialCode: string };
    const data = await inventoryRollService.getInventoryRollByMaterialCode(materialCode);
    res.json({ data });
  });

  createInventoryRoll = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreateInventoryRollDTO;
    const data = await inventoryRollService.createInventoryRoll(input);
    res.status(201).json({ data });
  });

  updateInventoryRoll = asyncHandler(async (req: Request, res: Response) => {
    const { materialCode } = (req.validatedParams ?? req.params) as { materialCode: string };
    const body = (req.validatedBody ?? req.body) as UpdateInventoryRollDTO;
    const updated = await inventoryRollService.updateInventoryRoll(materialCode, body);
    res.json({ data: updated });
  });

  deleteInventoryRoll = asyncHandler(async (req: Request, res: Response) => {
    const { materialCode } = (req.validatedParams ?? req.params) as { materialCode: string };
    await inventoryRollService.deleteInventoryRoll(materialCode);
    res.status(204).send();
  });
}

export const inventoryRollController = new InventoryRollController();
