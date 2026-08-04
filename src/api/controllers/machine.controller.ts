import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { machineService } from "../services/machine.service";
import type { CreateMachineDTO, UpdateMachineDTO } from "../validations/machines.validation";

class MachineController {
  getMachines = asyncHandler(async (req: Request, res: Response) => {
    const { type, productType, includeInactive } = (req.validatedQuery ?? req.query) as { type?: string; productType?: "printed" | "woven"; includeInactive?: boolean };
    const data = await machineService.getMachines({ type, productType, includeInactive });
    res.json({ data });
  });

  getMachine = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await machineService.getMachine(id);
    res.json({ data });
  });

  createMachine = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as CreateMachineDTO;
    const data = await machineService.createMachine(input);
    res.status(201).json({ data });
  });

  updateMachine = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = (req.validatedParams ?? req.params) as { id: string };
      const input = (req.validatedBody ?? req.body) as UpdateMachineDTO;
      const data = await machineService.updateMachine(id, input);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });

  deleteMachine = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await machineService.deleteMachine(id);
    res.status(204).send();
  });
}

export const machineController = new MachineController();
