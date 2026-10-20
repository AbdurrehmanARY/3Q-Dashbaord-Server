import type { Machine, Material, Operator, ProductionOrderLine } from "@db/schema";
import type { SizePlan } from "@db/size-plans";
import { completionPct, progressTargetOf } from "@shared/formulas/production-formula";
import { missingStartRequirements, toNumbers } from "./production-order.helpers";

function nameOf<T extends { name: string }>(map: Map<number, T>, id: number | null): string | null {
  return id != null ? (map.get(id)?.name ?? null) : null;
}

/** Operator avatar for the stage, so production screens can show a face beside the name. */
function avatarOf(map: Map<number, Operator>, id: number | null): string | null {
  return id != null ? (map.get(id)?.avatarUrl ?? null) : null;
}

/**
 * Pure assembly of the manager-dashboard payload from already-fetched rows: per-label-type
 * planning/assignment/live-progress detail plus the order rollups. Fetching stays in the
 * service; this is the shaping, split out so the service method stays small and this is
 * independently testable.
 */
export function buildProductionOverviewBody(
  rawLines: ProductionOrderLine[],
  allMachines: Machine[],
  allOperators: Operator[],
  allMaterials: Material[],
  totalQty: number,
  orderBatches: {
    productionOrderLineId: number | null;
    stage: string;
    assignedRolls: string | number;
    producedRolls: string | number;
    wastedRolls: string | number;
    status: string;
  }[] = []
) {
  const machineById = new Map(allMachines.map((m) => [m.id, m]));
  const operatorById = new Map(allOperators.map((o) => [o.id, o]));
  const materialByCode = new Map(allMaterials.map((m) => [m.code, m]));

  // Rolls currently on a machine at each stage: what running batches were given, less what
  // they have already turned out. Finished output is counted by the line's own counters.
  const inProgressBatchesByLine = new Map<number, { printing: number; cutting: number; packaging: number; activeStages: Set<string> }>();
  for (const b of orderBatches) {
    if (b.status !== "IN_PROGRESS" || b.productionOrderLineId == null) continue;
    if (!inProgressBatchesByLine.has(b.productionOrderLineId)) {
      inProgressBatchesByLine.set(b.productionOrderLineId, { printing: 0, cutting: 0, packaging: 0, activeStages: new Set() });
    }
    const rec = inProgressBatchesByLine.get(b.productionOrderLineId)!;
    rec.activeStages.add(b.stage);
    const qty = Math.max(
      0,
      Number(b.assignedRolls || 0) - Number(b.producedRolls || 0) - Number(b.wastedRolls || 0)
    );
    if (b.stage === "printing") rec.printing += qty;
    else if (b.stage === "cutting") rec.cutting += qty;
    else if (b.stage === "packaging") rec.packaging += qty;
  }

  const lines = rawLines.map((line) => {
    const n = toNumbers(line);
    /** Required rolls are the progress/completion target; totalRolls is the issued ceiling. */
    const target = progressTargetOf(n.requiredRolls, n.totalRolls);
    const material = line.materialCode ? materialByCode.get(line.materialCode) : undefined;
    const missing = missingStartRequirements(line);
    const batchRec = inProgressBatchesByLine.get(line.id) ?? { printing: 0, cutting: 0, packaging: 0, activeStages: new Set() };

    return {
      id: line.id,
      labelType: line.labelType,
      status: line.status,
      notes: line.notes,
      /** Workflow steps 3-5 — production is blocked until this is empty. */
      readiness: { canStart: missing.length === 0, missing },

            planning: {
        quantity: n.quantity,
        labelSize: n.labelSize,
        rollLength: n.rollLength,
        requiredRolls: n.requiredRolls,
        extraRolls: n.extraRolls,
        totalRolls: n.totalRolls,
        totalWeight: line.totalWeight != null ? Number(line.totalWeight) : null,
        sizes: (line.sizes ?? []) as SizePlan[],
      },

      // Material detail is echoed back (not just the code) so the floor can verify the
      // right material was picked without cross-referencing the material master.
      material: {
        materialCode: line.materialCode,
        description: material?.description ?? null,
        materialType: material?.type ?? null,
        weightPerRoll: material ? Number(material.weightPerRoll) : null,
        /** Rolls drawn from inventory for this line — the manual "Assigned Rolls" figure. */
        assignedRolls: n.issuedRolls,
        issuedRolls: n.issuedRolls,
        /** Planned rolls not yet drawn from inventory. */
        pendingIssue: Math.max(n.totalRolls - n.issuedRolls, 0),
        /** Weight actually committed = assigned rolls x this material's weight per roll. */
        assignedWeight: material ? Number(material.weightPerRoll) * n.issuedRolls : null,
      },

      // Each stage carries who did it, their avatar, and when it completed — together these
      // are the traceability record surfaced on a finished order.
      printing: {
        machineId: line.printingMachineId,
        machineName: nameOf(machineById, line.printingMachineId),
        operatorId: line.printingOperatorId,
        operatorName: nameOf(operatorById, line.printingOperatorId),
        operatorAvatarUrl: avatarOf(operatorById, line.printingOperatorId),
        printedRolls: n.printedRolls,
        inPrintingRolls: batchRec.printing,
        isPrintingActive: batchRec.activeStages.has("printing"),
        progressPct: completionPct(n.printedRolls, target),
        completedAt: line.printingCompletedAt,
      },
      cutting: {
        machineId: line.cuttingMachineId,
        machineName: nameOf(machineById, line.cuttingMachineId),
        operatorId: line.cuttingOperatorId,
        operatorName: nameOf(operatorById, line.cuttingOperatorId),
        operatorAvatarUrl: avatarOf(operatorById, line.cuttingOperatorId),
        sentToCuttingRolls: n.sentToCuttingRolls,
        cutRolls: n.cutRolls,
        inCuttingRolls: batchRec.cutting,
        isCuttingActive: batchRec.activeStages.has("cutting"),
        progressPct: completionPct(n.cutRolls, target),
        completedAt: line.cuttingCompletedAt,
      },
      packaging: {
        operatorId: line.packagingOperatorId,
        operatorName: nameOf(operatorById, line.packagingOperatorId),
        operatorAvatarUrl: avatarOf(operatorById, line.packagingOperatorId),
        sentToPackagingRolls: n.sentToPackagingRolls,
        packagedRolls: n.packagedRolls,
        packagedQty: n.packagedQty,
        inPackagingRolls: batchRec.packaging,
        isPackagingActive: batchRec.activeStages.has("packaging"),
        progressPct: completionPct(n.packagedRolls, target),
        completedAt: line.packagingCompletedAt,
      },

      liveProgress: {
        totalRolls: n.totalRolls,
        printedRolls: n.printedRolls,
        inPrintingRolls: batchRec.printing,
        unprintedRolls: Math.max(n.totalRolls - n.printedRolls, 0),
        waitingForCutting: Math.max(n.printedRolls - n.sentToCuttingRolls, 0),
        sentToCuttingRolls: n.sentToCuttingRolls,
        cutRolls: n.cutRolls,
        inCuttingRolls: batchRec.cutting,
        inCuttingProcess: Math.max(n.sentToCuttingRolls - n.cutRolls, 0),
        waitingForPackaging: Math.max(n.cutRolls - n.sentToPackagingRolls, 0),
        sentToPackagingRolls: n.sentToPackagingRolls,
        packagedRolls: n.packagedRolls,
        inPackagingRolls: batchRec.packaging,
        inPackagingProcess: Math.max(n.sentToPackagingRolls - n.packagedRolls, 0),
        completionPct: completionPct(n.packagedRolls, target),
      },

      stageInventory: {
        plannedRolls: n.totalRolls,
        printedTotal: n.printedRolls,
        cuttedTotal: n.cutRolls,
        packagedTotal: n.packagedRolls,
        inPrinting: batchRec.printing,
        inCutting: batchRec.cutting,
        inPackaging: batchRec.packaging,
        printedConsumed: n.cutRolls,
        printedAvailable: Math.max(0, n.printedRolls - n.cutRolls),
        cuttedConsumed: n.packagedRolls,
        cuttedAvailable: Math.max(0, n.cutRolls - n.packagedRolls),
        printable: Math.max(0, n.totalRolls - n.printedRolls),
        cuttable: Math.max(0, n.printedRolls - n.cutRolls),
        packagable: Math.max(0, n.cutRolls - n.packagedRolls),
        remainingRolls: Math.max(0, n.totalRolls - n.packagedRolls),
      },
    };
  });

  const sum = (pick: (n: ReturnType<typeof toNumbers>) => number) =>
    rawLines.reduce((acc, l) => acc + pick(toNumbers(l)), 0);

  const totalRolls = sum((n) => n.totalRolls);
  const totalRequired = sum((n) => progressTargetOf(n.requiredRolls, n.totalRolls));
  const printedRolls = sum((n) => n.printedRolls);
  const cutRolls = sum((n) => n.cutRolls);
  const packagedRolls = sum((n) => n.packagedRolls);
  const plannedQty = sum((n) => n.quantity);

  const printedAvailable = Math.max(0, printedRolls - cutRolls);
  const cuttedAvailable = Math.max(0, cutRolls - packagedRolls);
  const remainingRolls = Math.max(0, totalRolls - packagedRolls);

  const totalInPrinting = lines.reduce((acc, l) => acc + l.liveProgress.inPrintingRolls, 0);
  const totalInCutting = lines.reduce((acc, l) => acc + l.liveProgress.inCuttingRolls, 0);
  const totalInPackaging = lines.reduce((acc, l) => acc + l.liveProgress.inPackagingRolls, 0);

  const totals = {
    labelTypeCount: rawLines.length,
    plannedQty,
    unplannedQty: totalQty - plannedQty,
    packagedQty: sum((n) => n.packagedQty),
    requiredRolls: sum((n) => n.requiredRolls),
    extraRolls: sum((n) => n.extraRolls),
    totalRolls,
    totalWeight: rawLines.reduce((acc, l) => acc + (l.totalWeight != null ? Number(l.totalWeight) : 0), 0),
    assignedRolls: sum((n) => n.issuedRolls),
    assignedWeight: rawLines.reduce((acc, l) => {
      const material = l.materialCode ? materialByCode.get(l.materialCode) : undefined;
      return acc + (material ? Number(material.weightPerRoll) * Number(l.issuedRolls) : 0);
    }, 0),
    issuedRolls: sum((n) => n.issuedRolls),
    pendingIssue: sum((n) => Math.max(n.totalRolls - n.issuedRolls, 0)),
    printedRolls,
    inPrintingRolls: totalInPrinting,
    unprintedRolls: sum((n) => Math.max(n.totalRolls - n.printedRolls, 0)),
    sentToCuttingRolls: sum((n) => n.sentToCuttingRolls),
    cutRolls,
    inCuttingRolls: totalInCutting,
    inCuttingProcess: sum((n) => Math.max(n.sentToCuttingRolls - n.cutRolls, 0)),
    sentToPackagingRolls: sum((n) => n.sentToPackagingRolls),
    packagedRolls,
    inPackagingRolls: totalInPackaging,
    inPackagingProcess: sum((n) => Math.max(n.sentToPackagingRolls - n.packagedRolls, 0)),
    waitingForCutting: printedAvailable,
    waitingForPackaging: cuttedAvailable,
    completionPct: completionPct(packagedRolls, totalRequired),
    /* --- Explicit Stage Inventory Position --- */
    stageInventory: {
      plannedRolls: totalRolls,
      printedTotal: printedRolls,
      cuttedTotal: cutRolls,
      packagedTotal: packagedRolls,
      inPrintingTotal: totalInPrinting,
      inCuttingTotal: totalInCutting,
      inPackagingTotal: totalInPackaging,
      printedAvailable,
      cuttedAvailable,
      printable: Math.max(0, totalRolls - printedRolls),
      cuttable: printedAvailable,
      packagable: cuttedAvailable,
      remainingRolls,
      isReadyForCompletion: totalRequired > 0 && packagedRolls >= totalRequired,
    },
  };

  return { lines, totals };
}

