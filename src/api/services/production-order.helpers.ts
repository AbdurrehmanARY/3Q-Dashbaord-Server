import type { ProductionOrder, ProductionOrderLine } from "@db/schema";

export type ProductionStage = "printing" | "cutting" | "packaging";
export type TransferTarget = "cutting" | "packaging";

export interface PlanLineInput {
  labelType: string;
  quantity: number;
  labelSize: number;
  /** Roll length in metres (100 / 200 / 400 …). Defaults to 200 when omitted. */
  rollLength?: number;
  extraRolls?: number;
  materialCode?: string;
  /** Rolls the manager hands to this label type — drawn from inventory on save. */
  assignedRolls?: number;
  printingMachineId?: number | null;
  printingOperatorId?: number | null;
  notes?: string;
}

/** The five assignment slots on a line, with the label used in "already in use" errors. */
export const RESOURCE_SLOTS = [
  { key: "printingMachineId", kind: "machine", label: "Printing machine" },
  { key: "cuttingMachineId", kind: "machine", label: "Cutting machine" },
  { key: "printingOperatorId", kind: "operator", label: "Printing operator" },
  { key: "cuttingOperatorId", kind: "operator", label: "Cutting operator" },
  { key: "packagingOperatorId", kind: "operator", label: "Packaging operator" },
] as const;

/** Postgres returns every decimal column as a string; normalise once, up front. */
export function toNumbers(line: ProductionOrderLine) {
  return {
    quantity: Number(line.quantity),
    labelSize: Number(line.labelSize),
    rollLength: Number(line.rollLength),
    requiredRolls: Number(line.requiredRolls),
    extraRolls: Number(line.extraRolls),
    totalRolls: Number(line.totalRolls),
    issuedRolls: Number(line.issuedRolls),
    printedRolls: Number(line.printedRolls),
    sentToCuttingRolls: Number(line.sentToCuttingRolls),
    cutRolls: Number(line.cutRolls),
    sentToPackagingRolls: Number(line.sentToPackagingRolls),
    packagedRolls: Number(line.packagedRolls),
    packagedQty: Number(line.packagedQty),
  };
}

/**
 * Production cannot start until the line has a material, a printing machine and a
 * printing operator (workflow steps 3-5). Returns the missing pieces, empty when ready.
 */
export function missingStartRequirements(line: ProductionOrderLine): string[] {
  const missing: string[] = [];
  if (!line.materialCode) missing.push("material");
  if (line.printingMachineId == null) missing.push("printing machine");
  if (line.printingOperatorId == null) missing.push("printing operator");
  return missing;
}

/**
  * Cutting cannot proceed until the line has a cutting machine and cutting operator assigned.
  */
export function missingCuttingRequirements(line: { cuttingMachineId?: number | null; cuttingOperatorId?: number | null }): string[] {
  const missing: string[] = [];
  if (line.cuttingMachineId == null) missing.push("cutting machine");
  if (line.cuttingOperatorId == null) missing.push("cutting operator");
  return missing;
}

/**
 * Keeps the stage chain consistent by pulling every downstream counter down to its new
 * ceiling — lowering Printing to 8 drags Cutting (and everything after it) to at most 8.
 *
 * Downstream is only ever clamped **down**, never raised: raising Printing back to 10
 * does not un-cut rolls that were never cut. That is the one place this differs from a
 * literal reading of "increasing printing updates downstream stages" — inflating a
 * downstream counter would record work that did not happen.
 */
export function cascadeChain(chain: {
  printedRolls: number;
  sentToCuttingRolls: number;
  cutRolls: number;
  sentToPackagingRolls: number;
  packagedRolls: number;
}) {
  const sentToCuttingRolls = Math.min(chain.sentToCuttingRolls, chain.printedRolls);
  const cutRolls = Math.min(chain.cutRolls, sentToCuttingRolls);
  const sentToPackagingRolls = Math.min(chain.sentToPackagingRolls, cutRolls);
  const packagedRolls = Math.min(chain.packagedRolls, sentToPackagingRolls);
  return {
    printedRolls: chain.printedRolls,
    sentToCuttingRolls,
    cutRolls,
    sentToPackagingRolls,
    packagedRolls,
  };
}

/**
 * Stamps (or clears) each stage's completion time against the merged line.
 *
 * A stage is complete once its counter reaches the planned roll count. The timestamp is set
 * the first time that happens and preserved thereafter, so a later unrelated edit doesn't
 * keep bumping it. If a count is corrected back below the target the stamp is cleared —
 * leaving a completion time on a stage that is no longer complete would be a lie in the
 * traceability record.
 */
export function stageCompletionPatch(
  merged: ProductionOrderLine
): Pick<ProductionOrderLine, "printingCompletedAt" | "cuttingCompletedAt" | "packagingCompletedAt"> {
  const n = toNumbers(merged);
  const done = (value: number) => n.totalRolls > 0 && value >= n.totalRolls;
  const stamp = (isDone: boolean, existing: Date | null) =>
    isDone ? (existing ?? new Date()) : null;

  return {
    printingCompletedAt: stamp(done(n.printedRolls), merged.printingCompletedAt),
    cuttingCompletedAt: stamp(done(n.cutRolls), merged.cuttingCompletedAt),
    packagingCompletedAt: stamp(done(n.packagedRolls), merged.packagingCompletedAt),
  };
}

export function hasAnyProgress(line: ProductionOrderLine): boolean {
  const n = toNumbers(line);
  return (
    n.printedRolls > 0 ||
    n.sentToCuttingRolls > 0 ||
    n.cutRolls > 0 ||
    n.sentToPackagingRolls > 0 ||
    n.packagedRolls > 0
  );
}

/**
 * A line is `completed` once every planned roll is packaged, `active` once any progress
 * exists, else `pending`.
 */
export function deriveLineStatus(line: ProductionOrderLine): ProductionOrderLine["status"] {
  const n = toNumbers(line);
  if (n.totalRolls > 0 && n.packagedRolls >= n.totalRolls) return "completed";
  return hasAnyProgress(line) ? "active" : "pending";
}

/**
 * The production-order states:
 *   complete   — set manually by user via "Mark as Complete" button
 *   production — any label type has started
 *   planned    — nothing produced yet (incl. an order with no lines)
 */
export function deriveOrderPatch(
  lines: ProductionOrderLine[],
  current: ProductionOrder
): Partial<ProductionOrder> {
  // If the user manually set order status to complete, keep it complete.
  if (current.status === "complete") {
    return {
      status: "complete",
      plannedAt: current.plannedAt ?? new Date(),
      completedAt: current.completedAt ?? new Date(),
    };
  }

  // No lines yet: back to a clean "planned" with no timestamps.
  if (lines.length === 0) return { status: "planned", plannedAt: null, completedAt: null };

  const plannedAt = current.plannedAt ?? new Date();
  const anyStarted = lines.some(hasAnyProgress);

  return {
    status: anyStarted ? "production" : "planned",
    plannedAt,
    completedAt: null,
  };
}
