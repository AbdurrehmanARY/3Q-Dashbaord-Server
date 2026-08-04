import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { workOrderService } from "../services/work-order.service";
import type {
  CreateWorkOrderDTO,
  UpdateWorkOrderDTO,
  DispatchWorkOrderDTO,
} from "../validations/work-orders.validation";
import type { ListWorkOrdersQueryDTO } from "../validations/query.validation";

class WorkOrderController {
  getWorkOrders = asyncHandler(async (req: Request, res: Response) => {
    const query = (req.validatedQuery ?? req.query) as ListWorkOrdersQueryDTO;
    const data = await workOrderService.getWorkOrders(query);
    res.json({ data });
  });

  getWorkOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await workOrderService.getWorkOrder(id);
    res.json({ data });
  });

  createWorkOrder = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreateWorkOrderDTO;
    const data = await workOrderService.createWorkOrder(input);
    res.status(201).json({ data });
  });

  updateWorkOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = (req.validatedParams ?? req.params) as { id: string };
      const input = (req.validatedBody ?? req.body) as UpdateWorkOrderDTO;
      const data = await workOrderService.updateWorkOrder(id, input);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });

  /** Completes dispatch. DC Number and LC Number are both mandatory (see the service). */
  dispatchWorkOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as DispatchWorkOrderDTO;
    const data = await workOrderService.dispatchWorkOrder(id, input);
    res.json({ data });
  });

  deleteWorkOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await workOrderService.deleteWorkOrder(id);
    res.status(204).send();
  });
}

export const workOrderController = new WorkOrderController();
