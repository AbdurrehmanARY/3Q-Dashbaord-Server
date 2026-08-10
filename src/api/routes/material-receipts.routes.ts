import { Router } from "express";
import {
  stickerMaterialController,
  localSheetController,
  labelSheetController,
} from "@api/controllers/material-receipts.controller";
import { validateRequest, validateParams } from "@api/middleware/validateRequest";
import {
  createStickerMaterialSchema,
  updateStickerMaterialSchema,
  createLocalSheetSchema,
  updateLocalSheetSchema,
  createLabelSheetSchema,
  updateLabelSheetSchema,
} from "@api/validations/material-receipts.validation";
import { idParamsSchema } from "@api/validations/common.validation";

/* Mounted at /materials/stickers, /materials/local-sheets, /materials/label-sheets — see routes/index.ts. */

export const stickerMaterialsRouter = Router();
stickerMaterialsRouter.get("/", stickerMaterialController.getAll);
stickerMaterialsRouter.post("/", validateRequest(createStickerMaterialSchema), stickerMaterialController.create);
stickerMaterialsRouter.put(
  "/:id",
  validateParams(idParamsSchema),
  validateRequest(updateStickerMaterialSchema),
  stickerMaterialController.update
);
stickerMaterialsRouter.delete("/:id", validateParams(idParamsSchema), stickerMaterialController.remove);

export const localSheetsRouter = Router();
localSheetsRouter.get("/", localSheetController.getAll);
localSheetsRouter.post("/", validateRequest(createLocalSheetSchema), localSheetController.create);
localSheetsRouter.put(
  "/:id",
  validateParams(idParamsSchema),
  validateRequest(updateLocalSheetSchema),
  localSheetController.update
);
localSheetsRouter.delete("/:id", validateParams(idParamsSchema), localSheetController.remove);

export const labelSheetsRouter = Router();
labelSheetsRouter.get("/", labelSheetController.getAll);
labelSheetsRouter.post("/", validateRequest(createLabelSheetSchema), labelSheetController.create);
labelSheetsRouter.put(
  "/:id",
  validateParams(idParamsSchema),
  validateRequest(updateLabelSheetSchema),
  labelSheetController.update
);
labelSheetsRouter.delete("/:id", validateParams(idParamsSchema), labelSheetController.remove);
