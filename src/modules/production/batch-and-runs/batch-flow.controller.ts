import { Request, Response } from "express";
import { asyncHandler } from "@shared/errors/asyncHandler";
import { batchFlowService } from "./batch-flow.service";
import type { BatchStage } from "./batch-flow.helpers";
import type {
  CreatePrintingBatchDTO,
  CreateConsumingBatchDTO,
  UpdateBatchDTO,
  RecordOutputDTO,
} from "./batch-flow.schema";

/**
 * Batch CRUD, presented as three separate resources.
 *
 * The controller is built per stage (`new BatchFlowController("cutting")`) so
 * `/cutting-batches/:batchId` can never act on a printing batch, while the logic behind
 * all three stays in one place.
 */
export class BatchFlowController {
  constructor(private readonly stage: BatchStage) {}

  listByLine = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: number };
    const data = await batchFlowService.getLineBatches(lineId, this.stage);
    res.json({ data });
  });

  /** Where a new batch of this stage could draw its input from. */
  getSources = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: number };
    const data = await batchFlowService.getAvailableSources(lineId, this.stage);
    res.json({ data });
  });

  /** Machines and operators this stage may use, minus anything already held. */
  getResources = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: number };
    const { batchId } = (req.validatedQuery ?? req.query) as { batchId?: number };
    const data = await batchFlowService.getStageResources(lineId, this.stage, batchId);
    res.json({ data });
  });

  getOne = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = (req.validatedParams ?? req.params) as { batchId: number };
    const data = await batchFlowService.getBatch(batchId);
    res.json({ data });
  });

  getTrace = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = (req.validatedParams ?? req.params) as { batchId: number };
    const data = await batchFlowService.getTrace(batchId);
    res.json({ data });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const { lineId } = (req.validatedParams ?? req.params) as { lineId: number };
    const body = (req.validatedBody ?? req.body) as CreatePrintingBatchDTO & CreateConsumingBatchDTO;
    const data = await batchFlowService.createBatch(lineId, this.stage, {
      assignedRolls: body.assignedRolls,
      sources: body.sources,
      machineId: body.machineId,
      operatorId: body.operatorId,
      labelSize: body.labelSize,
      notes: body.notes,
      actorUserId: body.actorUserId,
    });
    res.status(201).json({ data });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = (req.validatedParams ?? req.params) as { batchId: number };
    const body = (req.validatedBody ?? req.body) as UpdateBatchDTO;
    const data = await batchFlowService.updateBatch(batchId, body, this.stage);
    res.json({ data });
  });

  start = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = (req.validatedParams ?? req.params) as { batchId: number };
    const { actorUserId } = (req.validatedBody ?? req.body ?? {}) as { actorUserId?: number };
    const data = await batchFlowService.startBatch(batchId, actorUserId, this.stage);
    res.json({ data });
  });

  recordOutput = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = (req.validatedParams ?? req.params) as { batchId: number };
    const body = (req.validatedBody ?? req.body) as RecordOutputDTO;
    const data = await batchFlowService.recordOutput(batchId, body, this.stage);
    res.json({ data });
  });

  complete = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = (req.validatedParams ?? req.params) as { batchId: number };
    const { actorUserId } = (req.validatedBody ?? req.body ?? {}) as { actorUserId?: number };
    const data = await batchFlowService.completeBatch(batchId, actorUserId, this.stage);
    res.json({ data });
  });

  cancel = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = (req.validatedParams ?? req.params) as { batchId: number };
    const { actorUserId } = (req.validatedBody ?? req.body ?? {}) as { actorUserId?: number };
    const data = await batchFlowService.cancelBatch(batchId, actorUserId, this.stage);
    res.json({ data });
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = (req.validatedParams ?? req.params) as { batchId: number };
    await batchFlowService.deleteBatch(batchId, this.stage);
    res.status(204).send();
  });
}

/** Order-level reads, which are not stage-scoped. */
class BatchOverviewController {
  getOrderFlow = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const data = await batchFlowService.getOrderFlow(id);
    res.json({ data });
  });

  /**
   * Every batch on an order, across all of its label types. Kept because a manager view wants
   * one order-wide list; the stage panels themselves read their own line.
   */
  getOrderBatches = asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req.validatedParams ?? req.params) as { id: string };
    const { stage } = (req.validatedQuery ?? req.query) as { stage?: BatchStage };
    const data = await batchFlowService.getOrderBatches(id, stage);
    res.json({ data });
  });
}

export const weavingBatchController = new BatchFlowController("weaving");
export const printingBatchController = new BatchFlowController("printing");
export const cuttingBatchController = new BatchFlowController("cutting");
export const packagingBatchController = new BatchFlowController("packaging");
export const batchOverviewController = new BatchOverviewController();
