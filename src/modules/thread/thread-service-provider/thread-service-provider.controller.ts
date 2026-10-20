import { Request, Response } from "express";
import { asyncHandler } from "@shared/errors/asyncHandler";
import { threadServiceProviderService } from "./thread-service-provider.service";

class ThreadServiceProviderController {
  getAll = asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: await threadServiceProviderService.getAll() });
  });
  create = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as Parameters<typeof threadServiceProviderService.create>[0];
    res.status(201).json({ data: await threadServiceProviderService.create(input) });
  });
  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as Parameters<typeof threadServiceProviderService.update>[1];
    res.json({ data: await threadServiceProviderService.update(Number(id), input) });
  });
  remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await threadServiceProviderService.remove(Number(id));
    res.status(204).send();
  });
}

export const threadServiceProviderController = new ThreadServiceProviderController();
