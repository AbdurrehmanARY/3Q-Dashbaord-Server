import type { Machine, Material, Operator, ProductionOrderLine } from "@db/schema";
import { completionPct } from "../utils/production-formula";
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
  totalQty: number
) {
  const machineById = new Map(allMachines.map((m) => [m.id, m]));
  const operatorById = new Map(allOperators.map((o) => [o.id, o]));
  const materialByCode = new Map(allMaterials.map((m) => [m.code, m]));

  const lines = rawLines.map((line) => {
    const n = toNumbers(line);
    const material = line.materialCode ? materialByCode.get(line.materialCode) : undefined;
    const missing = missingStartRequirements(line);
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
        requiredRolls: n.requiredRolls,
        extraRolls: n.extraRolls,
        totalRolls: n.totalRolls,
        totalWeight: line.totalWeight != null ? Number(line.totalWeight) : null,
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
        progressPct: completionPct(n.printedRolls, n.totalRolls),
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
        progressPct: completionPct(n.cutRolls, n.totalRolls),
        completedAt: line.cuttingCompletedAt,
      },
      packaging: {
        operatorId: line.packagingOperatorId,
        operatorName: nameOf(operatorById, line.packagingOperatorId),
        operatorAvatarUrl: avatarOf(operatorById, line.packagingOperatorId),
        sentToPackagingRolls: n.sentToPackagingRolls,
        packagedRolls: n.packagedRolls,
        packagedQty: n.packagedQty,
        progressPct: completionPct(n.packagedRolls, n.totalRolls),
        completedAt: line.packagingCompletedAt,
      },

      liveProgress: {
        totalRolls: n.totalRolls,
        printedRolls: n.printedRolls,
        /** Printed but not yet handed to cutting. */
        waitingForCutting: Math.max(n.printedRolls - n.sentToCuttingRolls, 0),
        sentToCuttingRolls: n.sentToCuttingRolls,
        cutRolls: n.cutRolls,
        /** Cut but not yet handed to packaging. */
        waitingForPackaging: Math.max(n.cutRolls - n.sentToPackagingRolls, 0),
        sentToPackagingRolls: n.sentToPackagingRolls,
        packagedRolls: n.packagedRolls,
        completionPct: completionPct(n.packagedRolls, n.totalRolls),
      },
    };
  });

  const sum = (pick: (n: ReturnType<typeof toNumbers>) => number) =>
    rawLines.reduce((acc, l) => acc + pick(toNumbers(l)), 0);

  const totalRolls = sum((n) => n.totalRolls);
  const packagedRolls = sum((n) => n.packagedRolls);
  const plannedQty = sum((n) => n.quantity);

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
    printedRolls: sum((n) => n.printedRolls),
    sentToCuttingRolls: sum((n) => n.sentToCuttingRolls),
    cutRolls: sum((n) => n.cutRolls),
    sentToPackagingRolls: sum((n) => n.sentToPackagingRolls),
    packagedRolls,
    waitingForCutting: sum((n) => Math.max(n.printedRolls - n.sentToCuttingRolls, 0)),
    waitingForPackaging: sum((n) => Math.max(n.cutRolls - n.sentToPackagingRolls, 0)),
    completionPct: completionPct(packagedRolls, totalRolls),
  };

  return { lines, totals };
}
