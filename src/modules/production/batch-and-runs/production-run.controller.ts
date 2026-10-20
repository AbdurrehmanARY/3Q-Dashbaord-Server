import { Request, Response } from "express";
import { asyncHandler } from "@shared/errors/asyncHandler";
import { productionRunService } from "./production-run.service";
import type { CreateProductionRunDTO } from "./production-run.schema";

class ProductionRunController {
  logRun = asyncHandler(async (req: Request, res: Response) => {
    const { saleOrderId } = (req.validatedParams ?? req.params) as { saleOrderId: number };
    const input = (req.validatedBody ?? req.body) as CreateProductionRunDTO;
    const data = await productionRunService.logProductionRun(Number(saleOrderId), input);
    res.status(201).json({ data });
  });

  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const { saleOrderId } = (req.validatedParams ?? req.params) as { saleOrderId: number };
    const data = await productionRunService.getProductionSummary(Number(saleOrderId));
    res.json({ data });
  });
}

export const productionRunController = new ProductionRunController();
