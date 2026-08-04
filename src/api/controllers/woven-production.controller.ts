import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { wovenProductionService } from "../services/woven-production.service";
import type {
  PlanWovenLineDTO,
  UpdateWeavingDTO,
  UpdateWovenCuttingDTO,
  UpdateWovenPackagingDTO,
  ReconcileRemainingThreadsDTO,
} from "../validations/woven-production.validation";

class WovenProductionController {
  getOverview = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await wovenProductionService.getOverview(id);
    res.json({ data });
  });

  /** Plans a new woven line (thread colours + machine + operator), reserving thread stock. */
  planLine = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as PlanWovenLineDTO;
    const data = await wovenProductionService.planLine(id, null, input);
    res.status(201).json({ data });
  });

  /** Re-plans an existing line — its previous thread draw is returned to stock first. */
  updateLinePlan = asyncHandler(async (req: Request, res: Response) => {
    const { id, lineId } = (req.validatedParams ?? req.params) as { id: string; lineId: string };
    const input = (req.validatedBody ?? req.body) as PlanWovenLineDTO;
    const data = await wovenProductionService.planLine(id, Number(lineId), input);
    res.json({ data });
  });

  deleteLine = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    await wovenProductionService.deleteLine(lineId);
    res.status(204).send();
  });

  updateWeaving = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const input = (req.validatedBody ?? req.body) as UpdateWeavingDTO;
    const data = await wovenProductionService.updateWeaving(lineId, input);
    res.json({ data });
  });

  updateCutting = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const input = (req.validatedBody ?? req.body) as UpdateWovenCuttingDTO;
    const data = await wovenProductionService.updateCutting(lineId, input);
    res.json({ data });
  });

  updatePackaging = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const input = (req.validatedBody ?? req.body) as UpdateWovenPackagingDTO;
    const data = await wovenProductionService.updatePackaging(lineId, input);
    res.json({ data });
  });

  reconcileRemaining = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const input = (req.validatedBody ?? req.body) as ReconcileRemainingThreadsDTO;
    const data = await wovenProductionService.reconcileRemainingThreads(lineId, input);
    res.json({ data });
  });
}

export const wovenProductionController = new WovenProductionController();
