import { Request, Response } from "express";
import { asyncHandler } from "@shared/errors/asyncHandler";
import { analyticsService } from "./analytics.service";

class AnalyticsController {
  getKpis = asyncHandler(async (_req: Request, res: Response) => {
    const data = await analyticsService.getKpis();
    res.json({ data });
  });
}

export const analyticsController = new AnalyticsController();
