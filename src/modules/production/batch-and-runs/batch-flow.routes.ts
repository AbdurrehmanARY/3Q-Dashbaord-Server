import { Router } from "express";
import {
  BatchFlowController,
  weavingBatchController,
  printingBatchController,
  cuttingBatchController,
  packagingBatchController,
  batchOverviewController,
} from "./batch-flow.controller";
import { validateRequest, validateParams, validateQuery } from "@shared/middleware/validateRequest";
import { idParamsSchema } from "@shared/validation/common.schema";
import {
  createPrintingBatchSchema,
  createConsumingBatchSchema,
  updateBatchSchema,
  recordOutputSchema,
  batchActionSchema,
  lineIdParamsSchema,
  batchIdParamsSchema,
  listBatchesQuerySchema,
  stageResourcesQuerySchema,
} from "./batch-flow.schema";
import type { BatchStage } from "./batch-flow.helpers";

/**
 * The nine verbs every stage supports. Mounted three times — one router per stage — so
 * Printing, Cutting and Packaging are genuinely separate resources with their own URLs and
 * their own create schema, while the logic behind them stays in one service.
 */
function stageRouter(controller: BatchFlowController, stage: BatchStage) {
  const router = Router({ mergeParams: true });
  // The first stage of each workflow draws from the plan; the rest consume upstream output.
  const createSchema =
    stage === "printing" || stage === "weaving"
      ? createPrintingBatchSchema
      : createConsumingBatchSchema;

  /* --- collection, scoped to a production line --- */
  router.get("/lines/:lineId", validateParams(lineIdParamsSchema), controller.listByLine);
  router.get("/lines/:lineId/sources", validateParams(lineIdParamsSchema), controller.getSources);
  router.get(
    "/lines/:lineId/resources",
    validateParams(lineIdParamsSchema),
    validateQuery(stageResourcesQuerySchema),
    controller.getResources
  );
  router.post("/lines/:lineId", validateRequest(createSchema), controller.create);

  /* --- one batch --- */
  router.get("/:batchId", validateParams(batchIdParamsSchema), controller.getOne);
  router.get("/:batchId/trace", validateParams(batchIdParamsSchema), controller.getTrace);
  router.patch("/:batchId", validateRequest(updateBatchSchema), controller.update);
  router.delete("/:batchId", validateParams(batchIdParamsSchema), controller.remove);

  /* --- lifecycle --- */
  router.post("/:batchId/start", validateRequest(batchActionSchema), controller.start);
  router.post("/:batchId/output", validateRequest(recordOutputSchema), controller.recordOutput);
  router.post("/:batchId/complete", validateRequest(batchActionSchema), controller.complete);
  router.post("/:batchId/cancel", validateRequest(batchActionSchema), controller.cancel);

  return router;
}

const router = Router();

/** Woven's first stage. Cutting and packaging are shared by both workflows. */
router.use("/weaving-batches", stageRouter(weavingBatchController, "weaving"));
router.use("/printing-batches", stageRouter(printingBatchController, "printing"));
router.use("/cutting-batches", stageRouter(cuttingBatchController, "cutting"));
router.use("/packaging-batches", stageRouter(packagingBatchController, "packaging"));

/* --- order-level reads, not stage-scoped --- */
router.get("/orders/:id/flow", validateParams(idParamsSchema), batchOverviewController.getOrderFlow);
router.get(
  "/orders/:id/batches",
  validateParams(idParamsSchema),
  validateQuery(listBatchesQuerySchema),
  batchOverviewController.getOrderBatches
);

export default router;
