import { Request, Response } from "express";
import { asyncHandler } from "@shared/errors/asyncHandler";
import {
  stickerMaterialService,
  localSheetService,
  labelSheetService,
} from "./material-receipts.service";

class StickerMaterialController {
  getAll = asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: await stickerMaterialService.getAll() });
  });
  create = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as Parameters<typeof stickerMaterialService.create>[0];
    res.status(201).json({ data: await stickerMaterialService.create(input) });
  });
  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as Parameters<typeof stickerMaterialService.update>[1];
    res.json({ data: await stickerMaterialService.update(Number(id), input) });
  });
  remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await stickerMaterialService.remove(Number(id));
    res.status(204).send();
  });
}

class LocalSheetController {
  getAll = asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: await localSheetService.getAll() });
  });
  create = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as Parameters<typeof localSheetService.create>[0];
    res.status(201).json({ data: await localSheetService.create(input) });
  });
  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as Parameters<typeof localSheetService.update>[1];
    res.json({ data: await localSheetService.update(Number(id), input) });
  });
  remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await localSheetService.remove(Number(id));
    res.status(204).send();
  });
}

class LabelSheetController {
  getAll = asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: await labelSheetService.getAll() });
  });
  create = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as Parameters<typeof labelSheetService.create>[0];
    res.status(201).json({ data: await labelSheetService.create(input) });
  });
  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as Parameters<typeof labelSheetService.update>[1];
    res.json({ data: await labelSheetService.update(Number(id), input) });
  });
  remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    await labelSheetService.remove(Number(id));
    res.status(204).send();
  });
}

export const stickerMaterialController = new StickerMaterialController();
export const localSheetController = new LocalSheetController();
export const labelSheetController = new LabelSheetController();
