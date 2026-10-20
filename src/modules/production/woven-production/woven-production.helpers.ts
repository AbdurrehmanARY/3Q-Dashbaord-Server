import type { ProductionOrder, WovenProductionLine } from "@db/schema";

/**
 * Pure woven-workflow arithmetic and status derivation — no database, no repositories, so
 * it can be unit-tested directly. Mirrors `production-order.helpers.ts` on the printed side.
 */

/** The planning spec allows at most eight thread colours per woven line. */
export const MAX_THREAD_COLORS = 8;

/** Postgres returns every decimal column as a string; normalise once, up front. */
export function toNumbers(line: WovenProductionLine) {
  return {
    quantity: Number(line.quantity),
    totalThreadWeightKg: Number(line.totalThreadWeightKg),
    wovenQty: Number(line.wovenQty),
    cutQty: Number(line.cutQty),
    packagedQty: Number(line.packagedQty),
    packagedWeightKg: Number(line.packagedWeightKg),
  };
}

export function hasWovenProgress(line: WovenProductionLine): boolean {
  const n = toNumbers(line);
  return n.wovenQty > 0 || n.cutQty > 0 || n.packagedQty > 0;
}

/**
 * Line status, derived from the counters — never set by hand:
 *   completed — every planned piece packaged
 *   active    — any stage has produced something
 *   pending   — nothing produced yet
 */
export function deriveWovenLineStatus(line: WovenProductionLine): WovenProductionLine["status"] {
  const n = toNumbers(line);
  if (n.quantity > 0 && n.packagedQty >= n.quantity) return "completed";
  return hasWovenProgress(line) ? "active" : "pending";
}

/** The parent order's status, derived from its woven lines. */
export function deriveWovenOrderPatch(
  lines: WovenProductionLine[],
  current: ProductionOrder
): Partial<ProductionOrder> {
  if (lines.length === 0) return { status: "planned", plannedAt: null, completedAt: null };

  const plannedAt = current.plannedAt ?? new Date();
  const allComplete = lines.every((l) => {
    const n = toNumbers(l);
    return n.quantity > 0 && n.packagedQty >= n.quantity;
  });
  if (allComplete) {
    return { status: "complete", plannedAt, completedAt: current.completedAt ?? new Date() };
  }
  return {
    status: lines.some(hasWovenProgress) ? "production" : "planned",
    plannedAt,
    completedAt: null,
  };
}

/* ---------------- Stage gates (shared by the service and the overview) ---------------- */

/** Cutting cannot begin until weaving is 100% complete. */
export function canStartCutting(line: WovenProductionLine): boolean {
  const n = toNumbers(line);
  return n.quantity > 0 && n.wovenQty >= n.quantity;
}

/** Packaging cannot begin until the cut quantity equals the woven quantity. */
export function canStartPackaging(line: WovenProductionLine): boolean {
  const n = toNumbers(line);
  return n.cutQty > 0 && n.cutQty >= n.wovenQty;
}
