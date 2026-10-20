import { Router } from "express";
import { wovenProductionController } from "./woven-production.controller";
import { validateRequest, validateParams } from "@shared/middleware/validateRequest";
import {
  planWovenLineSchema,
  updateWeavingSchema,
  updateWovenCuttingSchema,
  updateWovenPackagingSchema,
  reconcileRemainingThreadsSchema,
} from "./woven-production.schema";
import { idParamsSchema, lineIdParamsSchema } from "@shared/validation/common.schema";
import { z } from "zod";

const router = Router();

/** `/:id` is the production order; `/:id/lines/:lineId` addresses one woven line. */
const orderLineParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  lineId: z.coerce.number().int().positive(),
});

/* --- Woven dashboard --- */
router.get("/:id/overview", validateParams(idParamsSchema), wovenProductionController.getOverview);

/* --- Planning: thread colours (max 8) + weaving machine/operator. Draws thread stock. --- */
router.post(
  "/:id/lines",
  validateParams(idParamsSchema),
  validateRequest(planWovenLineSchema),
  wovenProductionController.planLine
);
router.put(
  "/:id/lines/:lineId",
  validateParams(orderLineParamsSchema),
  validateRequest(planWovenLineSchema),
  wovenProductionController.updateLinePlan
);
router.delete("/lines/:lineId", validateParams(lineIdParamsSchema), wovenProductionController.deleteLine);

/* --- Stages: Weaving -> Cutting -> Packaging, each gated on the one before it. --- */
router.patch(
  "/lines/:lineId/weaving",
  validateParams(lineIdParamsSchema),
  validateRequest(updateWeavingSchema),
  wovenProductionController.updateWeaving
);
router.patch(
  "/lines/:lineId/cutting",
  validateParams(lineIdParamsSchema),
  validateRequest(updateWovenCuttingSchema),
  wovenProductionController.updateCutting
);
router.patch(
  "/lines/:lineId/packaging",
  validateParams(lineIdParamsSchema),
  validateRequest(updateWovenPackagingSchema),
  wovenProductionController.updatePackaging
);
router.patch(
  "/lines/:lineId/reconcile-remaining",
  validateParams(lineIdParamsSchema),
  validateRequest(reconcileRemainingThreadsSchema),
  wovenProductionController.reconcileRemaining
);

export default router;
