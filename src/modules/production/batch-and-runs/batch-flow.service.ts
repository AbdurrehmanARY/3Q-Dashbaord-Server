import {
  batchFlowRepository,
  type CreateBatchInput,
  type UpdateBatchInput,
  type RecordOutputInput,
} from "./batch-flow.repository";
import { productionOrderRepository } from "../production-orders/production-order.repository";
import { machineRepository } from "@modules/machines/machine.repository";
import { operatorRepository } from "@modules/operators/operator.repository";
import { NotFoundError, BadRequestError } from "@shared/errors/ApiError";
import { Messages } from "@shared/constants/messages";
import { userService } from "@modules/users/user.service";
import { wovenProductionRepository } from "../woven-production/woven-production.repository";
import type { SizePlan } from "@db/size-plans";
import {
  type BatchStage,
  type LineKind,
  type LineRef,
  lineFlowOf,
  isReadyForCompletion,
  isFirstStage,
  kindOwnsStage,
  STAGES_OF,
  STAGE_MACHINE_TYPE,
  STAGE_DESIGNATION,
  STAGE_TITLE,
  OPERATOR_PRODUCT_TYPE,
  UNIT_OF,
  estimatedMinutesFor,
  round2,
} from "./batch-flow.helpers";

/**
 * Batch CRUD for all three stages.
 *
 * One service, parameterised by stage, behind three separate API resources. The stages are
 * structurally identical — reserve input, record output, run a status lifecycle — so
 * forking this into three copies would only create three places for the same bug.
 */
export class BatchFlowService {
  /**
   * Resolves a line id to the workflow that owns it. Printed and woven lines live in
   * separate tables, so the id alone is ambiguous — every entry point starts here.
   */
  private async resolveLine(lineId: number | string, kind?: LineKind): Promise<LineRef> {
    const id = Number(lineId);
    const [woven, printed] = await Promise.all([
      wovenProductionRepository.findLineById(id),
      productionOrderRepository.findLineById(id),
    ]);

    if (kind === "woven") {
      if (woven) return { kind: "woven", id };
      // Naming the actual workflow beats "not found" when the id is real but belongs to
      // the other pipeline — the usual cause is a printed stage hitting a woven line.
      if (printed) {
        throw new BadRequestError(
          `'${printed.labelType}' is a printed label type — it runs Printing, not Weaving`
        );
      }
      throw new NotFoundError(Messages.notFound("Woven production line"));
    }
    if (kind === "printed") {
      if (printed) return { kind: "printed", id };
      // Naming the actual workflow beats "not found" when the id is real but belongs to
      // the other pipeline — the usual cause is a printed stage hitting a woven line.
      if (woven) {
        throw new BadRequestError(
          `'${woven.labelType}' is a woven label type — it runs Weaving, not Printing`
        );
      }
      throw new NotFoundError(Messages.notFound("Production order line"));
    }

    // Cutting and packaging exist in both workflows, so the line itself decides.
    if (woven) return { kind: "woven", id };
    if (printed) return { kind: "printed", id };
    throw new NotFoundError(Messages.notFound("Production line"));
  }

  /** The workflow a stage belongs to when it is unambiguous (weaving/printing). */
  private kindForStage(stage: BatchStage): LineKind | undefined {
    if (stage === "weaving") return "woven";
    if (stage === "printing") return "printed";
    return undefined; // cutting and packaging exist in both
  }

  /**
   * Decorates batches with how long each should take. Only weaving has a known formula so
   * far, and it needs the design's pick/repeat/speed — fetched once per call rather than
   * per batch. Every other stage comes back as 0, which the UI shows as `00:00`.
   */
  private async withEstimates<T extends { stage: BatchStage; assignedRolls: string | number }>(
    batches: T[],
    productionOrderId?: number
  ) {
    const needsContext = batches.some((b) => b.stage === "weaving");
    const ctx =
      needsContext && productionOrderId
        ? await wovenProductionRepository.findOrderContext(productionOrderId)
        : null;

    return batches.map((b) => ({
      ...b,
      estimatedMinutes: estimatedMinutesFor(b.stage, Number(b.assignedRolls), ctx),
    }));
  }

  /* ------------------------------------------------------------------ reads */

  /**
   * Batches of ONE label type, at every stage it runs.
   *
   * Line-scoped reads answer all three stages now that cutting and packaging carry a line: the
   * panel for a stage asks this and gets the batches the floor is actually running for that
   * label type.
   */
  async getLineBatches(lineId: number | string, stage?: BatchStage) {
    const line = await this.resolveLine(lineId, this.kindForStage(stage ?? "cutting"));
    if (stage && !kindOwnsStage(line.kind, stage)) return [];
    const batches = await batchFlowRepository.findByLine(line, stage);
    const orderId =
      line.kind === "woven"
        ? (await wovenProductionRepository.findLineById(line.id))?.productionOrderId
        : (await productionOrderRepository.findLineById(line.id))?.productionOrderId;
    return this.withEstimates(batches, orderId);
  }

  async getOrderBatches(orderId: number | string, stage?: BatchStage) {
    const order = await productionOrderRepository.findById(orderId);
    if (!order) throw new NotFoundError(Messages.notFound("Production order"));
    const kind: LineKind = order.productType === "woven" ? "woven" : "printed";
    const batches = await batchFlowRepository.findByOrder(Number(orderId), kind, stage);
    return this.withEstimates(batches, Number(orderId));
  }

  async getBatch(batchId: number | string) {
    const batch = await batchFlowRepository.findById(Number(batchId));
    if (!batch) throw new NotFoundError(Messages.notFound("Batch"));
    // Every batch carries its line, so `withEstimates` can resolve context from the batch's own
    // order without a special case for any stage. Every mutating route re-reads via this method,
    // which is why it must stay total.
    const [withEstimate] = await this.withEstimates([batch], batch.productionOrderId);
    return withEstimate;
  }

  async getTrace(batchId: number | string) {
    const batch = await batchFlowRepository.findById(Number(batchId));
    if (!batch) throw new NotFoundError(Messages.notFound("Batch"));
    const trace = await batchFlowRepository.findTrace(Number(batchId));
    return { batch, ...trace };
  }

  /**
   * The flow position of every label type on an order — planned, assigned, produced and
   * available at each stage. This is what the dashboard reads.
   *
   * Every figure is a plain sum over the label type's OWN batches. All three stages carry the
   * line, so there is no attribution to resolve, no weight to normalise, and no way for one
   * batch to be counted twice.
   */
  async getOrderFlow(orderId: number | string) {
    const order = await productionOrderRepository.findById(orderId);
    if (!order) throw new NotFoundError(Messages.notFound("Production order"));

    const kind: LineKind = order.productType === "woven" ? "woven" : "printed";
    const batches = await batchFlowRepository.findByOrder(Number(orderId), kind);
    const stages = STAGES_OF[kind];

        const rawLines =
      kind === "woven"
        ? (await wovenProductionRepository.findLines(Number(orderId))).map((l) => ({
            id: l.id,
            labelType: l.labelType,
            planned: Number(l.quantity),
            quantity: Number(l.quantity),
            required: 0,
            materialCode: null as string | null,
            sizes: (l.sizes ?? []) as SizePlan[],
          }))
        : (await productionOrderRepository.findLines(Number(orderId))).map((l) => ({
            id: l.id,
            labelType: l.labelType,
            planned: Number(l.totalRolls),
            required: Number(l.requiredRolls ?? 0),
            quantity: Number(l.quantity),
            materialCode: l.materialCode,
            sizes: (l.sizes ?? []) as SizePlan[],
          }));

    const perLine = rawLines.map((line) => {
      const own = batches.filter((b) =>
        kind === "woven" ? b.wovenProductionLineId === line.id : b.productionOrderLineId === line.id
      );
      const first = STAGES_OF[kind][0];
      const live = <T extends { status: string }>(list: T[]) =>
        list.filter((b) => b.status !== "CANCELLED");
      const ownFirst = own.filter((b) => b.stage === first);
      const ownCutting = own.filter((b) => b.stage === "cutting");
      const ownPackaging = own.filter((b) => b.stage === "packaging");

      const flow = lineFlowOf(line.planned, ownFirst, kind, line.sizes);

      /** Summed over this label type's own batches — cancelled ones count for nothing. */
      const sumOf = (
        list: typeof own,
        pick: "producedRolls" | "consumedRolls" | "packagedQty"
      ) => round2(live(list).reduce((n, b) => n + Number(b[pick] ?? 0), 0));

      const cutProduced = sumOf(ownCutting, "producedRolls");
      const cutConsumed = sumOf(ownCutting, "consumedRolls");
      const packagedProduced = sumOf(ownPackaging, "producedRolls");
      const packagedLabels = sumOf(ownPackaging, "packagedQty");

      return {
        lineId: line.id,
        labelType: line.labelType,
        quantity: line.quantity,
        materialCode: line.materialCode,
        kind,
        unit: UNIT_OF[kind],
        required: line.required,
        stages,
        ...flow,
        cutProduced,
        cutAvailable: round2(Math.max(0, cutProduced - cutConsumed)),
        packagedProduced,
        packagedLabels,
        remainingRolls: round2(Math.max(0, line.planned - packagedProduced)),
        batchCounts: {
          printing: live(ownFirst).length,
          cutting: live(ownCutting).length,
          packaging: live(ownPackaging).length,
        },
        running: [
          ...new Set(live(own).filter((b) => b.status === "IN_PROGRESS").map((b) => b.batchCode)),
        ],
      };
    });

    const totals = perLine.reduce(
      (acc, l) => ({
        planned: acc.planned + l.planned,
        required: acc.required + l.required,
        assignedToPrinting: acc.assignedToPrinting + l.assignedToPrinting,
        remainingPlanned: acc.remainingPlanned + l.remainingPlanned,
        printedProduced: acc.printedProduced + l.printedProduced,
        printedAvailable: acc.printedAvailable + l.printedAvailable,
        printedWasted: acc.printedWasted + l.printedWasted,
        cutProduced: acc.cutProduced + l.cutProduced,
        cutAvailable: acc.cutAvailable + l.cutAvailable,
        packagedProduced: acc.packagedProduced + l.packagedProduced,
        packagedLabels: acc.packagedLabels + l.packagedLabels,
        remainingRolls: acc.remainingRolls + l.remainingRolls,
        wastedTotal: acc.wastedTotal + l.wastedTotal,
      }),
      {
        planned: 0, assignedToPrinting: 0, remainingPlanned: 0,
        required: 0,
        printedProduced: 0, printedAvailable: 0, printedWasted: 0,
        cutProduced: 0, cutAvailable: 0,
        packagedProduced: 0, packagedLabels: 0, remainingRolls: 0,
        wastedTotal: 0,
      }
    );

    return {
      lines: perLine,
      totals,
      kind,
      unit: UNIT_OF[kind],
      stages,
      /** Reaching the target only makes the order READY — completing it stays a user action. */
      readyForCompletion: isReadyForCompletion(perLine),
    };
  }

  /**
   * The batches a new batch of `stage` could draw from, with what each still has available.
   * Powers the source picker — the UI never has to compute availability itself.
   */
  async getAvailableSources(lineId: number | string, stage: BatchStage) {
    const line = await this.resolveLine(lineId, this.kindForStage(stage));
    const unit = UNIT_OF[line.kind];

          if (isFirstStage(line.kind, stage)) {
        const planned = await this.plannedQtyOf(line);
        const batches = await batchFlowRepository.findByLine(line);
        const sizes = line.kind === "woven"
          ? (await wovenProductionRepository.findLineById(line.id))?.sizes ?? []
          : [];
        const flow = lineFlowOf(planned, batches, line.kind, sizes);
        return {
          stage,
          kind: line.kind,
          unit,
          fromPlan: true,
          remainingPlanned: flow.remainingPlanned,
          sizes: flow.sizes,
          sources: [],
        };
    }

    const upstream = stage === "cutting" ? STAGES_OF[line.kind][0] : "cutting";
    // Input never leaves its label type: a cutting batch draws from THIS line's printed/woven
    // output and a packaging batch from THIS line's cut output. `lockSourcesTx` enforces the
    // same rule on write, so the picker can only ever offer what `createBatch` will accept.
    const batches = await batchFlowRepository.findByLine(line, upstream);
    const sources = batches
      .filter((b) => b.status !== "CANCELLED" && Number(b.availableRolls) > 0)
      .map((b) => ({
        sourceBatchId: b.id,
        batchCode: b.batchCode,
        producedRolls: Number(b.producedRolls),
        availableRolls: Number(b.availableRolls),
        machineName: b.machineName,
        operatorName: b.operatorName,
        status: b.status,
      }));

    return {
      stage,
      kind: line.kind,
      unit,
      fromPlan: false,
      totalAvailable: sources.reduce((n, s) => n + s.availableRolls, 0),
      sources,
    };
  }

  /** The planned quantity a line's first stage draws from. */
  private async plannedQtyOf(line: LineRef) {
    if (line.kind === "woven") {
      const row = await wovenProductionRepository.findLineById(line.id);
      return Number(row?.quantity ?? 0);
    }
    const row = await productionOrderRepository.findLineById(line.id);
    return Number(row?.totalRolls ?? 0);
  }

  /**
   * The machines and operators this stage can actually use, already filtered two ways:
   *
   *   by stage    printing shows Printing machines and Printing operators, cutting shows
   *               Cutting, packaging shows Packaging operators and no machines at all
   *   by hold     anything committed to another live batch is excluded
   *
   * Doing both here means the UI never has to know the rules, and a stale dropdown cannot
   * offer a press that someone else took thirty seconds ago.
   */
  async getStageResources(lineId: number | string, stage: BatchStage, excludeBatchId?: number) {
    const line = await this.resolveLine(lineId, this.kindForStage(stage));
    return this.resolveStageResources(line.kind, stage, excludeBatchId);
  }

  /** Shared body of the resource reader — the workflow kind comes from the line. */
  private async resolveStageResources(kind: LineKind, stage: BatchStage, excludeBatchId?: number) {
    const [allMachines, allOperators, holds] = await Promise.all([
      machineRepository.findAll(),
      operatorRepository.findAll({ productType: OPERATOR_PRODUCT_TYPE[kind] }),
      batchFlowRepository.findResourceHolds(excludeBatchId),
    ]);

        const heldMachines = new Map(
      holds.filter((h) => h.machineId).map((h) => [h.machineId!, `${h.productionNumber} · ${h.labelType} (${h.batchCode})`])
    );
    // Weaving operators are never held — one weaver can run multiple looms.
    const heldOperators = new Map(
      holds
        .filter((h) => h.operatorId && h.stage !== "weaving")
        .map((h) => [h.operatorId!, `${h.productionNumber} · ${h.labelType} (${h.batchCode})`])
    );

    /** Packaging is done by hand — it never offers a machine. */
    const machines =
      stage === "packaging"
        ? []
        : allMachines
            .filter((m) => m.machineType === STAGE_MACHINE_TYPE[stage] && m.status !== "Maintenance")
            .map((m) => ({
              id: m.id,
              name: m.machineName,
              machineType: m.machineType,
              isHeld: heldMachines.has(m.id),
              heldBy: heldMachines.get(m.id) ?? null,
            }));

    // Weaving operators are never marked held — they can move between looms.
    const operators = allOperators
      .filter((o) => o.designation === STAGE_DESIGNATION[stage])
      .map((o) => ({
        id: o.id,
        name: o.name,
        designation: o.designation,
        avatarUrl: o.avatarUrl ?? null,
        isHeld: stage !== "weaving" && heldOperators.has(o.id),
        heldBy: stage !== "weaving" ? heldOperators.get(o.id) ?? null : null,
      }));

    return {
      stage,
      kind,
      requiresMachine: stage !== "packaging",
      machines,
      operators,
      availableMachines: machines.filter((m) => !m.isHeld).length,
      availableOperators: operators.filter((o) => !o.isHeld).length,
    };
  }

  /* ----------------------------------------------------------------- writes */

  /**
   * Creates a batch of any stage, against its production line.
   *
   * There is one create path for all four stages now: `lineId` names the label type the batch
   * runs, and the server derives the order from it. Cutting and packaging used to need an
   * order-scoped route because they carried no line; they carry one now, so they use this one.
   */
  async createBatch(lineId: number | string, stage: BatchStage, input: Omit<CreateBatchInput, "stage">) {
    const line = await this.resolveLine(lineId, this.kindForStage(stage));
    if (!kindOwnsStage(line.kind, stage)) {
      throw new BadRequestError(
        `${STAGE_TITLE[stage]} is not a stage of the ${line.kind} workflow`
      );
    }

    if (line.kind === "printed") {
      const printed = await productionOrderRepository.findLineById(line.id);
      const order = await productionOrderRepository.findById(printed!.productionOrderId);
      if (order?.status === "complete") {
        throw new BadRequestError("Cannot add batches to a completed production order");
      }
      if (!printed!.materialCode) {
        throw new BadRequestError("Assign material to this label type before starting production");
      }
    } else {
      const woven = await wovenProductionRepository.findLineById(line.id);
      const order = await productionOrderRepository.findById(woven!.productionOrderId);
      if (order?.status === "complete") {
        throw new BadRequestError("Cannot add batches to a completed production order");
      }
      // Woven planning reserves thread; weaving cannot start before that is done.
      if (!woven!.planningCompletedAt) {
        throw new BadRequestError("Complete thread planning for this label type first");
      }
    }

    const actorUserId = await userService.assertActor(input.actorUserId ?? undefined);
    const orderId =
      line.kind === "woven"
        ? (await wovenProductionRepository.findLineById(line.id))?.productionOrderId
        : (await productionOrderRepository.findLineById(line.id))?.productionOrderId;
    if (!orderId) throw new NotFoundError(Messages.notFound("Production order"));
    const batch = await batchFlowRepository.createBatch(
      { productionOrderId: orderId, kind: line.kind, line },
      { ...input, stage, actorUserId }
    );
    return this.getBatch(batch.id);
  }

  async updateBatch(batchId: number | string, input: UpdateBatchInput, stage?: BatchStage) {
    await this.assertBatchStage(batchId, stage);
    const actorUserId = await userService.assertActor(input.actorUserId ?? undefined);
    await batchFlowRepository.updateBatch(Number(batchId), { ...input, actorUserId });
    return this.getBatch(batchId);
  }

  async startBatch(batchId: number | string, actorUserId?: number, stage?: BatchStage) {
    await this.assertBatchStage(batchId, stage);
    const actor = await userService.assertActor(actorUserId);
    await batchFlowRepository.startBatch(Number(batchId), actor);
    return this.getBatch(batchId);
  }

  async recordOutput(batchId: number | string, input: RecordOutputInput, stage?: BatchStage) {
    await this.assertBatchStage(batchId, stage);
    const actorUserId = await userService.assertActor(input.actorUserId ?? undefined);
    await batchFlowRepository.recordOutput(Number(batchId), { ...input, actorUserId });
    return this.getBatch(batchId);
  }

  async completeBatch(batchId: number | string, actorUserId?: number, stage?: BatchStage) {
    await this.assertBatchStage(batchId, stage);
    const actor = await userService.assertActor(actorUserId);
    await batchFlowRepository.completeBatch(Number(batchId), actor);
    return this.getBatch(batchId);
  }

  async cancelBatch(batchId: number | string, actorUserId?: number, stage?: BatchStage) {
    await this.assertBatchStage(batchId, stage);
    const actor = await userService.assertActor(actorUserId);
    await batchFlowRepository.cancelBatch(Number(batchId), actor);
    return this.getBatch(batchId);
  }

  async deleteBatch(batchId: number | string, stage?: BatchStage) {
    await this.assertBatchStage(batchId, stage);
    return batchFlowRepository.deleteBatch(Number(batchId));
  }

  /**
   * Guards the stage-scoped routes: `/cutting-batches/:id` must not act on a printing
   * batch. The stage comes from the route, so this is the check that keeps three separate
   * resources genuinely separate.
   */
  private async assertBatchStage(batchId: number | string, stage?: BatchStage) {
    const batch = await batchFlowRepository.findById(Number(batchId));
    if (!batch) throw new NotFoundError(Messages.notFound("Batch"));
    if (stage && batch.stage !== stage) {
      throw new NotFoundError(`${batch.batchCode} is a ${batch.stage} batch, not a ${stage} batch`);
    }
    return batch;
  }
}

export const batchFlowService = new BatchFlowService();
