import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { analyticsService } from "../services/analytics.service";

class AnalyticsController {
  getKpis = asyncHandler(async (_req: Request, res: Response) => {
    const data = await analyticsService.getKpis();
    res.json({ data });
  });
}

export const analyticsController = new AnalyticsController();
