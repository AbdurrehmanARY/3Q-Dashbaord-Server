import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { inkService } from "../services/ink.service";
import type {
  CreateInkPurchaseDTO,
  UpdateInkPurchaseDTO,
  CreateInkConsumptionDTO,
} from "../validations/ink.validation";

class InkController {
  /* Purchases */
  listPurchases = asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: await inkService.listPurchases() });
  });
  createPurchase = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreateInkPurchaseDTO;
    res.status(201).json({ data: await inkService.createPurchase(input) });
  });
  updatePurchase = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as UpdateInkPurchaseDTO;
    res.json({ data: await inkService.updatePurchase(Number(id), input) });
  });
  removePurchase = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await inkService.removePurchase(Number(id));
    res.status(204).send();
  });

  /* Stock (derived) */
  stock = asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: await inkService.stock() });
  });

  /* Consumptions */
  listConsumptions = asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: await inkService.listConsumptions() });
  });
  byOperator = asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: await inkService.consumptionByOperator() });
  });
  createConsumption = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreateInkConsumptionDTO;
    res.status(201).json({ data: await inkService.createConsumption(input) });
  });
  removeConsumption = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await inkService.removeConsumption(Number(id));
    res.status(204).send();
  });
}

export const inkController = new InkController();
