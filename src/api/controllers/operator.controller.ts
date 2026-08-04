import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { operatorService } from "../services/operator.service";
import type { CreateOperatorDTO, UpdateOperatorDTO } from "../validations/operators.validation";

class OperatorController {
  getOperators = asyncHandler(async (req: Request, res: Response) => {
    const query = (req.validatedQuery ?? req.query) as Parameters<
      typeof operatorService.getOperators
    >[0];
    const data = await operatorService.getOperators(query);
    res.json({ data });
  });

  getOperator = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await operatorService.getOperator(id);
    res.json({ data });
  });

  createOperator = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreateOperatorDTO;
    const data = await operatorService.createOperator(input);
    res.status(201).json({ data });
  });

  updateOperator = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = (req.validatedParams ?? req.params) as { id: string };
      const input = (req.validatedBody ?? req.body) as UpdateOperatorDTO;
      const data = await operatorService.updateOperator(id, input);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });

  deleteOperator = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await operatorService.deleteOperator(id);
    res.status(204).send();
  });
}

export const operatorController = new OperatorController();
