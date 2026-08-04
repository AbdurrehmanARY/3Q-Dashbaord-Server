import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { productionOrderService } from "../services/production-order.service";
import type {
  CreateProductionOrderDTO,
  UpdateProductionOrderDTO,
  PlanLineDTO,
  AssignLineResourcesDTO,
  UpdateStageProgressDTO,
  TransferRollsDTO,
  IssueRollsDTO,
  UpdateLineFullDTO,
} from "../validations/production-orders.validation";
import type { ListProductionOrdersQueryDTO } from "../validations/query.validation";

class ProductionOrderController {
  getProductionOrders = asyncHandler(async (req: Request, res: Response) => {
    const { status, soNumber, poNumber } = (req.validatedQuery ?? req.query) as ListProductionOrdersQueryDTO;
    const data = await productionOrderService.getProductionOrders({ status, soNumber, poNumber });
    res.json({ data });
  });

  getEligibleSalesOrders = asyncHandler(async (_req: Request, res: Response) => {
    const data = await productionOrderService.getEligibleSalesOrders();
    res.json({ data });
  });

  getProductionOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await productionOrderService.getProductionOrder(id);
    res.json({ data });
  });

  getProductionOrderOverview = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await productionOrderService.getProductionOrderOverview(id);
    res.json({ data });
  });

  /**
   * Machines and operators not already held by another active job. `excludeLineId` /
   * `excludeOrderId` keep the caller's own current selection in the list, so editing a
   * line doesn't blank out the resource it already has.
   */
  getAvailableResources = asyncHandler(async (req: Request, res: Response) => {
    const { lineId, orderId, productType } = (req.validatedQuery ?? req.query) as {
      lineId?: string;
      orderId?: string;
      productType?: "printed" | "woven";
    };
    const data = await productionOrderService.getAvailableResources(
      {
        lineId: lineId ? Number(lineId) : undefined,
        productionOrderId: orderId ? Number(orderId) : undefined,
      },
      productType
    );
    res.json({ data });
  });

  createProductionOrder = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreateProductionOrderDTO;
    const data = await productionOrderService.createProductionOrder(input);
    res.status(201).json({ data });
  });

  updateProductionOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as UpdateProductionOrderDTO;
    const data = await productionOrderService.updateProductionOrder(id, input);
    res.json({ data });
  });

  deleteProductionOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await productionOrderService.deleteProductionOrder(id);
    res.status(204).send();
  });

  /* --- Per-label-type planning. One record at a time; submitting reserves resources. --- */

  planLine = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as PlanLineDTO;
    const data = await productionOrderService.planLine(id, input);
    res.status(201).json({ data });
  });

  updateLinePlan = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const input = (req.validatedBody ?? req.body) as PlanLineDTO;
    const data = await productionOrderService.updateLinePlan(lineId, input);
    res.json({ data });
  });

  deleteLine = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    await productionOrderService.deleteLine(lineId);
    res.status(204).send();
  });

  assignLineResources = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const input = (req.validatedBody ?? req.body) as AssignLineResourcesDTO;
    const data = await productionOrderService.assignLineResources(lineId, input);
    res.json({ data });
  });

  updatePrintingProgress = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const input = (req.validatedBody ?? req.body) as UpdateStageProgressDTO;
    const data = await productionOrderService.updateStageProgress(lineId, "printing", input);
    res.json({ data });
  });

  updateCuttingProgress = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const input = (req.validatedBody ?? req.body) as UpdateStageProgressDTO;
    const data = await productionOrderService.updateStageProgress(lineId, "cutting", input);
    res.json({ data });
  });

  updatePackagingProgress = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const input = (req.validatedBody ?? req.body) as UpdateStageProgressDTO;
    const data = await productionOrderService.updateStageProgress(lineId, "packaging", input);
    res.json({ data });
  });

  updateLineFull = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const input = (req.validatedBody ?? req.body) as UpdateLineFullDTO;
    const data = await productionOrderService.updateLineFull(lineId, input);
    res.json({ data });
  });

  transferRolls = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const input = (req.validatedBody ?? req.body) as TransferRollsDTO;
    const data = await productionOrderService.transferRolls(lineId, input);
    res.status(201).json({ data });
  });

  issueRolls = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const input = (req.validatedBody ?? req.body) as IssueRollsDTO;
    const data = await productionOrderService.issueRolls(lineId, input);
    res.status(201).json({ data });
  });

  getLineIssuances = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const page = (req.validatedQuery ?? {}) as { limit?: number; offset?: number };
    const data = await productionOrderService.getLineIssuances(lineId, page);
    res.json({ data });
  });

  getLineEvents = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: string };
    const page = (req.validatedQuery ?? {}) as { limit?: number; offset?: number };
    const data = await productionOrderService.getLineEvents(lineId, page);
    res.json({ data });
  });

  getOrderEvents = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const page = (req.validatedQuery ?? {}) as { limit?: number; offset?: number };
    const data = await productionOrderService.getOrderEvents(id, page);
    res.json({ data });
  });
}

export const productionOrderController = new ProductionOrderController();
