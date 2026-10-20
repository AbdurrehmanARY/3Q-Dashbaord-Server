import { Request, Response } from "express";
import { asyncHandler } from "@shared/errors/asyncHandler";
import { threadInventoryService } from "./thread-inventory.service";
import type {
  CreateThreadPurchaseDTO,
  CreateDyeBatchDTO,
} from "./thread-inventory.schema";

class ThreadInventoryController {
  /* ---- Stock ---- */
  getStocks = asyncHandler(async (req: Request, res: Response) => {
    const query = (req.validatedQuery ?? req.query) as Parameters<
      typeof threadInventoryService.getStocks
    >[0];
    const data = await threadInventoryService.getStocks(query);
    res.json({ data });
  });

  /** Primary (undyed) and secondary (dyed) pools with their totals. */
  getStockSummary = asyncHandler(async (_req: Request, res: Response) => {
    const data = await threadInventoryService.getStockSummary();
    res.json({ data });
  });

  createStock = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as Parameters<
      typeof threadInventoryService.createStock
    >[0];
    const data = await threadInventoryService.createStock(input);
    res.status(201).json({ data });
  });

  updateStock = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as Parameters<
      typeof threadInventoryService.updateStock
    >[1];
    const data = await threadInventoryService.updateStock(Number(id), input);
    res.json({ data });
  });

  deleteStock = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await threadInventoryService.deleteStock(Number(id));
    res.status(204).send();
  });

  getMovements = asyncHandler(async (req: Request, res: Response) => {
    const { threadStockId, limit } = (req.validatedQuery ?? req.query) as {
      threadStockId?: number;
      limit?: number;
    };
    const data = await threadInventoryService.getMovements(threadStockId, limit);
    res.json({ data });
  });

  /* ---- Purchases ---- */
  getPurchases = asyncHandler(async (req: Request, res: Response) => {
    const query = (req.validatedQuery ?? req.query) as Parameters<
      typeof threadInventoryService.getPurchases
    >[0];
    const data = await threadInventoryService.getPurchases(query);
    res.json({ data });
  });

  createPurchase = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreateThreadPurchaseDTO;
    const data = await threadInventoryService.createPurchase(input);
    res.status(201).json({ data });
  });

  deletePurchase = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await threadInventoryService.deletePurchase(Number(id));
    res.status(204).send();
  });

  /* ---- Dyeing ---- */
  getDyeBatches = asyncHandler(async (_req: Request, res: Response) => {
    const data = await threadInventoryService.getDyeBatches();
    res.json({ data });
  });

  createDyeBatch = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreateDyeBatchDTO;
    const data = await threadInventoryService.createDyeBatch(input);
    res.status(201).json({ data });
  });
}

export const threadInventoryController = new ThreadInventoryController();
