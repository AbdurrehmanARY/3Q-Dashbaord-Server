import { Request, Response } from "express";
import { asyncHandler } from "@shared/errors/asyncHandler";
import { threadDyeingService } from "./thread-dyeing.service";

class ThreadDyeingController {
  listSends = asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: await threadDyeingService.listSends() });
  });

  send = asyncHandler(async (req: Request, res: Response) => {
    const input = (req.validatedBody ?? req.body) as Parameters<typeof threadDyeingService.sendForDyeing>[0];
    res.status(201).json({ data: await threadDyeingService.sendForDyeing(input) });
  });

  receive = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const input = (req.validatedBody ?? req.body) as Parameters<typeof threadDyeingService.receiveDyed>[1];
    res.status(201).json({ data: await threadDyeingService.receiveDyed(Number(id), input) });
  });
}

export const threadDyeingController = new ThreadDyeingController();
