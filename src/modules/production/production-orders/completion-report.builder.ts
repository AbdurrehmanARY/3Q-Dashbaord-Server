import type { LineKind } from "../batch-and-runs/batch-flow.helpers";
import { STAGES_OF } from "../batch-and-runs/batch-flow.helpers";

/**
 * Human-readable label for a stage, per workflow. Printed's first stage is Printing;
 * woven's is Weaving. Cutting and Packaging are shared by both pipelines.
 */
const STAGE_LABELS: Record<string, string> = {
  printing: "Printing",
  weaving: "Weaving",
  cutting: "Cutting",
  packaging: "Packaging",
};

export type CompletionLineKind = LineKind;

/**
 * Minimal structural view of a batch row as returned by `batchFlowRepository.findByOrder`.
 *
 * The completion report only needs the waste / assignment columns and the resolved
 * label + operator names, so the builder stays decoupled from the repository's full
 * return type (which also carries consumption edges and live counters). That keeps it
 * a pure, independently-testable function.
 */
export interface CompletionReportBatch {
  stage: string;
  status: string;
  labelType: string | null;
  operatorName: string | null;
  machineName: string | null;
  batchCode: string;
  /** Input reserved for this batch — the rolls/pieces it was given. */
  assignedRolls: string | number;
  /** Good output this batch produced. */
  producedRolls: string | number;
  /** Input scrapped on this batch — recordable at any stage since migration 0027. */
  wastedRolls: string | number;
  /** Free-text reason for the scrap, NULL when none was given. */
  wasteReason: string | null;
}

export interface CompletionStageDetail {
  stage: string;
  label: string;
  batchCount: number;
  issued: number;
  produced: number;
  wasted: number;
}

export interface WasteBreakdownEntry {
  stage: string;
  labelType: string;
  reason: string;
  wasted: number;
}

export interface OperatorWasteEntry {
  operatorName: string;
  totalWasted: number;
  breakdown: WasteBreakdownEntry[];
}

export interface LabelTypeWaste {
  labelType: string;
  totalWasted: number;
  byOperator: { operatorName: string; totalWasted: number }[];
}

export interface CompletionReportTotals {
  /** Total input drawn — the first stage's assigned figure (what fed the line). */
  issued: number;
  /** Final good output — the packaging stage's produced figure. */
  produced: number;
  /** Total scrapped — summed across every stage's waste. */
  wasted: number;
  /** Unaccounted input: issued − produced − wasted (rolls/pieces still in process). */
  remaining: number;
  /** produced ÷ issued, clamped to 100 — the line's good-output yield. */
  yieldPct: number;
  /** wasted ÷ issued. */
  wastePct: number;
}

export interface CompletionReport {
  productType: "printed" | "woven";
  unit: "rolls" | "pcs";
  totals: CompletionReportTotals;
  stageDetail: CompletionStageDetail[];
  wasteByOperator: OperatorWasteEntry[];
  wasteByLabelType: LabelTypeWaste[];
}

const round = (n: number) => Math.round(n);

/** Percentage of `part` against `whole`, clamped to 100 like production-formula's `completionPct`. */
const pct = (part: number, whole: number) =>
  whole > 0 ? Math.min(100, Math.round((part / whole) * 10000) / 100) : 0;

/** Postgres decimals arrive as strings; normalise once, null/undefined → 0. */
function num(v: string | number | null | undefined): number {
  return Number(v ?? 0) || 0;
}

const UNDEFINED_OPERATOR = "Unassigned";
const UNDEFINED_LABEL_TYPE = "Unassigned";
const UNDEFINED_REASON = "No reason recorded";

/* === BUILDER === */
/**
 * Pure assembly of the Completion Report from already-fetched batch rows.
 *
 * Production rules applied here (see `.clinerules`):
 *  - Only COMPLETED batches count toward stage totals / report totals.
 *  - CANCELLED batches never move counts (filtered out by the COMPLETED guard).
 *  - Waste is attributed to the operator and stage of the batch it was recorded on.
 *
 * The report is order-wide: it does not care which label type a batch ran under, except
 * to break waste down per label type for the floor's reconciliation.
 */
export function buildCompletionReport(
  batches: CompletionReportBatch[],
  kind: CompletionLineKind
): CompletionReport {
  const stages = STAGES_OF[kind];
  const firstStage = stages[0]; // printing (printed) | weaving (woven)
  const lastStage = stages[stages.length - 1]; // packaging

  // Per the production rules: only COMPLETED batches count toward totals.
  const counted = batches.filter((b) => b.status === "COMPLETED");

  // ---- per-stage detail (every stage present, zero when empty) ----
  const stageDetail: CompletionStageDetail[] = stages.map((stage) => {
    const inStage = counted.filter((b) => b.stage === stage);
    return {
      stage,
      label: STAGE_LABELS[stage] ?? stage,
      batchCount: inStage.length,
      issued: round(inStage.reduce((s, b) => s + num(b.assignedRolls), 0)),
      produced: round(inStage.reduce((s, b) => s + num(b.producedRolls), 0)),
      wasted: round(inStage.reduce((s, b) => s + num(b.wastedRolls), 0)),
    };
  });

  // ---- order-wide totals ----
  const issued = stageDetail.find((s) => s.stage === firstStage)?.issued ?? 0;
  const produced = stageDetail.find((s) => s.stage === lastStage)?.produced ?? 0;
  const wasted = stageDetail.reduce((s, st) => s + st.wasted, 0);
  const remaining = Math.max(0, issued - produced - wasted);

  const totals: CompletionReportTotals = {
    issued,
    produced,
    wasted,
    remaining,
    yieldPct: pct(produced, issued),
    wastePct: pct(wasted, issued),
  };

  /* === WASTE_BREAKDOWN === */
  // ---- per-operator waste breakdown (completed batches only) ----
  const opMap = new Map<string, OperatorWasteEntry>();
  for (const b of counted) {
    const w = num(b.wastedRolls);
    if (w <= 0) continue;
    const op = b.operatorName ?? UNDEFINED_OPERATOR;
    const lt = b.labelType ?? UNDEFINED_LABEL_TYPE;
    const reason = b.wasteReason ?? UNDEFINED_REASON;

    const entry = opMap.get(op) ?? { operatorName: op, totalWasted: 0, breakdown: [] };
    entry.totalWasted += w;
    const existing = entry.breakdown.find(
      (x) => x.stage === b.stage && x.labelType === lt && x.reason === reason
    );
    if (existing) {
      existing.wasted += w;
    } else {
      entry.breakdown.push({ stage: b.stage, labelType: lt, reason, wasted: w });
    }
    opMap.set(op, entry);
  }
  const wasteByOperator: OperatorWasteEntry[] = [...opMap.values()]
    .map((e) => ({
      ...e,
      totalWasted: round(e.totalWasted),
      breakdown: e.breakdown.map((x) => ({ ...x, wasted: round(x.wasted) })),
    }))
    .sort((a, b) => b.totalWasted - a.totalWasted || a.operatorName.localeCompare(b.operatorName));

  // ---- per-label-type waste (with per-operator split) ----
  const ltMap = new Map<string, { totalWasted: number; ops: Map<string, number> }>();
  for (const b of counted) {
    const w = num(b.wastedRolls);
    if (w <= 0) continue;
    const lt = b.labelType ?? UNDEFINED_LABEL_TYPE;
    const rec = ltMap.get(lt) ?? { totalWasted: 0, ops: new Map() };
    rec.totalWasted += w;
    const op = b.operatorName ?? UNDEFINED_OPERATOR;
    rec.ops.set(op, (rec.ops.get(op) ?? 0) + w);
    ltMap.set(lt, rec);
  }
  const wasteByLabelType: LabelTypeWaste[] = [...ltMap.entries()]
    .map(([labelType, rec]) => ({
      labelType,
      totalWasted: round(rec.totalWasted),
      byOperator: [...rec.ops.entries()]
        .map(([name, total]) => ({ operatorName: name, totalWasted: round(total) }))
        .sort((a, b) => b.totalWasted - a.totalWasted || a.operatorName.localeCompare(b.operatorName)),
    }))
    .sort((a, b) => b.totalWasted - a.totalWasted || a.labelType.localeCompare(b.labelType));

  const unit: "rolls" | "pcs" = kind === "woven" ? "pcs" : "rolls";

  return {
    productType: kind,
    unit,
    totals,
    stageDetail,
    wasteByOperator,
    wasteByLabelType,
  };
}
