import { BadRequestError } from "@shared/errors/ApiError";
import { normalizeSize, type SizePlan } from "@db/size-plans";

export type BatchStage = "weaving" | "printing" | "cutting" | "packaging";
export type BatchStatus = "PLANNED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

/**
 * Which workflow a line belongs to. The two pipelines share a batch lifecycle, a
 * consumption-edge table and every guarantee that comes with them; they differ in only two
 * places — their first stage, and what they count.
 *
 *   printed   Printing -> Cutting -> Packaging, measured in ROLLS
 *   woven     Weaving  -> Cutting -> Packaging, measured in PIECES
 */
export type LineKind = "printed" | "woven";

/**
 * A line of one workflow — in practice, one label type.
 *
 * Every batch carries one of these at every stage: `production_batches_one_line` requires
 * exactly one line column to be set (num_nonnulls = 1) for printing, weaving, cutting AND
 * packaging. The line IS the batch's label type — and which workflow its `kind` names is what
 * says whether its figures count ROLLS (printed) or PIECES (woven).
 */
export interface LineRef {
  kind: LineKind;
  id: number;
}


/** The stages each workflow runs, in order. */
export const STAGES_OF: Record<LineKind, BatchStage[]> = {
  printed: ["printing", "cutting", "packaging"],
  woven: ["weaving", "cutting", "packaging"],
};

export function kindOwnsStage(kind: LineKind, stage: BatchStage) {
  return STAGES_OF[kind].includes(stage);
}

/** Rolls for printed, pieces for woven — what the figures on screen are counting. */
export const UNIT_OF: Record<LineKind, "rolls" | "pcs"> = {
  printed: "rolls",
  woven: "pcs",
};

/**
 * The stage each stage draws from. Cutting's upstream depends on the workflow — printing
 * on the printed side, weaving on the woven — which is the one place the pipelines
 * genuinely diverge. Adding a workflow means adding a row here and a matching pair to the
 * `batch_consumptions_valid_adjacency` check constraint.
 */
export const UPSTREAM_OF: Record<LineKind, Record<BatchStage, BatchStage | null>> = {
  printed: { weaving: null, printing: null, cutting: "printing", packaging: "cutting" },
  woven: { weaving: null, printing: null, cutting: "weaving", packaging: "cutting" },
};

export const DOWNSTREAM_OF: Record<LineKind, Record<BatchStage, BatchStage | null>> = {
  printed: { weaving: null, printing: "cutting", cutting: "packaging", packaging: null },
  woven: { weaving: "cutting", printing: null, cutting: "packaging", packaging: null },
};

/** Whether a stage draws from the PLAN rather than from another batch. */
export function isFirstStage(kind: LineKind, stage: BatchStage) {
  return STAGES_OF[kind][0] === stage;
}

export function requireUpstream(kind: LineKind, stage: BatchStage): BatchStage {
  const upstream = UPSTREAM_OF[kind][stage];
  if (!upstream) {
    throw new BadRequestError(
      `${STAGE_TITLE[stage]} draws from the production plan, not from another batch`
    );
  }
  return upstream;
}

const CODE_PREFIX: Record<BatchStage, string> = {
  weaving: "W",
  printing: "P",
  cutting: "C",
  packaging: "PK",
};

export const STAGE_TITLE: Record<BatchStage, string> = {
  weaving: "Weaving",
  printing: "Printing",
  cutting: "Cutting",
  packaging: "Packaging",
};

/** W-001, P-001, C-002, PK-003 — derived once at creation, then stable for the batch's life. */
export function batchCodeFor(stage: BatchStage, batchNumber: number) {
  return `${CODE_PREFIX[stage]}-${String(batchNumber).padStart(3, "0")}`;
}

/** The stage ledger predates weaving; its first-stage credit covers both openings. */
export function stageTxTypeFor(stage: BatchStage) {
  return stage === "cutting" ? "cut_credit" : stage === "packaging" ? "package_credit" : "print_credit";
}

/** What a stage calls what it takes in, so error messages read naturally. */
export function inputNoun(kind: LineKind, stage: BatchStage) {
  const upstream = UPSTREAM_OF[kind][stage];
  if (!upstream) return "planned";
  return upstream === "printing" ? "printed" : upstream === "weaving" ? "woven" : "cut";
}

/* ------------------------------------------------------------------ figures */

/** One batch's position, from its four stored quantities. */
export interface BatchQuantities {
  assignedRolls: string | number;
  producedRolls: string | number;
  wastedRolls: string | number;
  consumedRolls: string | number;
  status?: BatchStatus;
}

export interface BatchPosition {
  assigned: number;
  produced: number;
  wasted: number;
  consumed: number;
  /** produced − consumed: what the next stage can still take from this batch. */
  available: number;
  /** assigned − produced − wasted: input still to be worked through. */
  pending: number;
}

const n = (v: string | number | null | undefined) => Number(v ?? 0) || 0;
export const EPSILON = 0.005;

export function round2(v: number) {
  return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
}

export function batchPositionOf(b: BatchQuantities): BatchPosition {
  const assigned = n(b.assignedRolls);
  const produced = n(b.producedRolls);
  const wasted = n(b.wastedRolls);
  const consumed = n(b.consumedRolls);
  return {
    assigned,
    produced,
    wasted,
    consumed,
    available: round2(Math.max(0, produced - consumed)),
    pending: round2(Math.max(0, assigned - produced - wasted)),
  };
}

/**
 * A whole label type's flow position, summed from its live batches.
 *
 * The field names read as the printed workflow because it came first; on a woven line
 * `printedProduced` is what weaving made, and every figure is in pieces.
 */
export interface LineFlow {
  planned: number;
  assignedToPrinting: number;
  remainingPlanned: number;
  printedProduced: number;
  printedAvailable: number;
  printedWasted: number;
  /** Σ wasted across ALL live stages (printing, weaving, cutting, packaging). */
  wastedTotal: number;
  cutProduced: number;
  cutAvailable: number;
  packagedProduced: number;
  packagedLabels: number;
  /** Quantity that has not yet reached packaging. */
  remainingRolls: number;
  /** Per-size breakdown — populated for woven Size Label lines, empty everywhere else. */
  sizes: LineSizeFlow[];
}

export interface FlowBatch extends BatchQuantities {
  stage: BatchStage;
  packagedQty?: string | number;
  /** Which planned size a weaving batch weaves — present on size-label batches only. */
  labelSize?: string | null;
}

/** Per-size tracking for a woven Size Label line. */
export interface LineSizeFlow {
  size: string;
  /** Planned pieces for this size — from the line's `sizes` array. */
  planned: number;
  /** Pieces already assigned to live weaving batches of this size. */
  assigned: number;
  /** planned − assigned. */
  remaining: number;
  /** Pieces of this size already woven. */
  produced: number;
}

/**
 * Per-size breakdown — populated for woven Size Label lines, empty everywhere else.
 * Each entry shows how much of that size was planned, is assigned to batches so far,
 * and still needs a batch.
 */
export function lineSizeFlows(sizes: SizePlan[], batches: FlowBatch[], firstStage: BatchStage): LineSizeFlow[] {
  if (sizes.length === 0) return [];
  const firstBatches = batches.filter(
    (b) => b.stage === firstStage && b.status !== "CANCELLED"
  );
  return sizes.map((s) => {
    const own = firstBatches.filter((b) => normalizeSize(b.labelSize) === normalizeSize(s.size));
    const assigned = round2(own.reduce((acc, b) => acc + batchPositionOf(b).assigned, 0));
    const produced = round2(own.reduce((acc, b) => acc + batchPositionOf(b).produced, 0));
    return {
      size: s.size,
      planned: round2(s.quantity),
      assigned,
      remaining: round2(Math.max(0, s.quantity - assigned)),
      produced,
    };
  });
}

export function lineFlowOf(
  planned: number,
  batches: FlowBatch[],
  kind: LineKind = "printed",
  sizes: SizePlan[] = []
): LineFlow {
  const first = STAGES_OF[kind][0];
  const live = batches.filter((b) => b.status !== "CANCELLED");
  const sum = (stage: BatchStage, pick: (p: BatchPosition, b: FlowBatch) => number) =>
    round2(
      live.filter((b) => b.stage === stage).reduce((acc, b) => acc + pick(batchPositionOf(b), b), 0)
    );

  const assignedToFirst = sum(first, (p) => p.assigned);
  const packagedProduced = sum("packaging", (p) => p.produced);
  /** Sum a pick across ALL live stages (not stage-specific like `sum`). */
  const sumAll = (pick: (p: BatchPosition, b: FlowBatch) => number) =>
    round2(live.reduce((acc, b) => acc + pick(batchPositionOf(b), b), 0));
  const wastedTotal = sumAll((p) => p.wasted);

  return {
    planned: round2(planned),
    /** Assigned to the first stage: printing on the printed side, weaving on the woven. */
    assignedToPrinting: assignedToFirst,
    /**
     * How many first-stage rolls the planner may still assign. Waste at ANY stage
     * is tracked and displayed, but does NOT create extra headroom: the user must
     * edit the plan (increase totalRolls) to add more capacity.
     *   planned - assignedToFirst
     * A negative figure is clamped to 0.
     */
    remainingPlanned: round2(Math.max(0, planned - assignedToFirst)),
    printedProduced: sum(first, (p) => p.produced),
    printedAvailable: sum(first, (p) => p.available),
    printedWasted: sum(first, (p) => p.wasted),
    /** Σ wasted across ALL live stages — drives the make-up ceiling. */
    wastedTotal: sumAll((p) => p.wasted),
    cutProduced: sum("cutting", (p) => p.produced),
    cutAvailable: sum("cutting", (p) => p.available),
    packagedProduced,
    packagedLabels: sum("packaging", (_p, b) => n(b.packagedQty)),
    remainingRolls: round2(Math.max(0, planned - packagedProduced)),
    /** Per-size tracking from the line's Size Label plan. */
    sizes: lineSizeFlows(sizes, batches, first),
  };
}

/* ------------------------------------------------------------- validation */

/** Can the first stage reserve this much more of the plan? */
export function assertWithinPlan(
  qty: number,
  remainingPlanned: number,
  planned: number,
  kind: LineKind = "printed",
  stage: BatchStage = "printing"
) {
  const unit = UNIT_OF[kind];
  if (qty <= 0) throw new BadRequestError(`Assigned ${unit} must be greater than zero`);
  if (qty > remainingPlanned + EPSILON) {
    throw new BadRequestError(
      `Cannot assign ${round2(qty)} ${unit} to ${stage}: ${round2(remainingPlanned)} of the ` +
        `${round2(planned)} planned ${unit} remain unassigned`
    );
  }
}

/** Can this allocation be taken from `source`? */
export function assertWithinAvailable(
  qty: number,
  source: BatchQuantities & { batchCode: string; stage: BatchStage },
  kind: LineKind = "printed"
) {
  const available = batchPositionOf(source).available;
  const noun =
    source.stage === "printing" ? "printed" : source.stage === "weaving" ? "woven" : "cut";
  if (qty > available + EPSILON) {
    throw new BadRequestError(
      `${source.batchCode} has only ${available} ${noun} ${UNIT_OF[kind]} available; ` +
        `requested ${round2(qty)}`
    );
  }
}

/** Output can never exceed the input the batch was given. */
export function assertOutputWithinInput(
  produced: number,
  wasted: number,
  assigned: number,
  code: string,
  kind: LineKind = "printed"
) {
  if (produced < 0 || wasted < 0) throw new BadRequestError("Output cannot be negative");
  if (produced + wasted > assigned + EPSILON) {
    throw new BadRequestError(
      `${code} was assigned ${round2(assigned)} ${UNIT_OF[kind]}: cannot record ` +
        `${round2(produced)} produced` +
        (wasted > 0 ? ` and ${round2(wasted)} wasted` : "")
    );
  }
}

/**
 * Whether every line has packaged enough to fulfil its REQUIRED roll count
 * (the plan minus the extra/buffer). Reaching this only makes an order READY —
 * completing it stays a deliberate user action.
 * Waste is counted toward completion (produced + wasted >= required) but does NOT
 * grant extra assignment capacity: the user must edit the plan to add more rolls.
 * When a line carries no required breakdown (`required` omitted or 0) the target
 * falls back to `planned`, preserving the historical total-issued semantics.
 */
export function isReadyForCompletion(
  lines: { planned: number; packagedProduced: number; wastedTotal: number; required?: number }[]
) {
  if (lines.length === 0) return false;
  return lines.every((l) => {
    const target = l.required && l.required > 0 ? l.required : l.planned;
    return target > 0 && l.packagedProduced + l.wastedTotal >= target - EPSILON;
  });
}

/* --------------------------------------------------------- resource mapping */

/**
 * Which machine type and operator designation each stage may use. This is the single
 * definition of "the respective one" — the resource pickers, the create guard and the start
 * guard all read it, so a stage can never be offered equipment it cannot run.
 *
 * Packaging has no machine type: it is done by hand.
 */
export const STAGE_MACHINE_TYPE: Record<BatchStage, string | null> = {
  weaving: "Woven",
  printing: "Printing",
  cutting: "Cutting",
  packaging: null,
};

export const STAGE_DESIGNATION: Record<BatchStage, string> = {
  weaving: "Weaving",
  printing: "Printing",
  cutting: "Cutting",
  packaging: "Packaging",
};

/** Operators are trained per workflow; a woven batch never offers a printed-only operator. */
export const OPERATOR_PRODUCT_TYPE: Record<LineKind, "printed" | "woven"> = {
  printed: "printed",
  woven: "woven",
};

/* --------------------------------------------------------- time estimates */

/** The woven design figures the weaving-time formula needs. */
export interface WovenTimeContext {
  pick?: string | number | null;
  repeat?: string | number | null;
  speed?: string | number | null;
}

/** Looms default to 600 RPM when the design does not state a speed. */
const DEFAULT_LOOM_RPM = 600;

/**
 * How long a batch should take, in minutes.
 *
 * Only weaving has a known formula so far — the same one the line-level estimate uses,
 * with the batch's own quantity substituted for the line's:
 *
 *   minutes = (qty / repeat) x pick / speed
 *
 * (the line-level version divides by `speed * 60` for hours; this returns minutes).
 *
 * Every other stage returns 0, which the UI renders as `00:00`. Add a case here when its
 * formula is known — nothing else needs to change.
 */
export function estimatedMinutesFor(
  stage: BatchStage,
  qty: number,
  ctx?: WovenTimeContext | null
): number {
  if (stage !== "weaving") return 0;

  const pick = Number(ctx?.pick ?? 0);
  const repeat = Number(ctx?.repeat ?? 0);
  const speed = Number(ctx?.speed ?? 0) > 0 ? Number(ctx?.speed) : DEFAULT_LOOM_RPM;
  if (!(pick > 0) || !(repeat > 0) || !(qty > 0)) return 0;

  return Math.round(((qty / repeat) * pick) / speed);
}

/** Minutes as `HH:MM`, the format the floor reads on a job ticket. */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Beam thread: what is left on the beam once an order is packaged.
 *
 *   beamThread = packaged weight − dyed thread consumed
 *
 * Stated by the business as-is. It goes negative whenever consumption exceeds packaged
 * weight, which is the normal case physically, so it is surfaced signed rather than
 * clamped — a negative figure is information, not an error to hide.
 */
export function beamThreadKgOf(packagedWeightKg: number, dyedThreadUsedKg: number): number {
  return Math.round((Number(packagedWeightKg || 0) - Number(dyedThreadUsedKg || 0)) * 1000) / 1000;
}
