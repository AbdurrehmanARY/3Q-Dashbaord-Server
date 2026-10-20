/**
 * Canonical roll-planning arithmetic. This is the single source of truth for the
 * project — the client mirrors it for live preview only, and the values persisted on
 * a production order line are always the ones computed here.
 */

/** Default roll length in metres when a line does not specify one (200 m ⇒ the old 7800 constant). */
export const DEFAULT_ROLL_LENGTH_M = 200;

/**
 * Rolls required to produce `quantity` labels (fractional; stored with decimal precision).
 *
 *   labelsPerRoll = (rollLength × 39) / (labelSizeMm / 25)
 *   requiredRolls = quantity / labelsPerRoll
 *
 * Roll length is now a factor (100 / 200 / 400 m …), configurable per line. At the legacy
 * default of 200 m this is identical to the previous `7800 / (labelSizeMm / 25)` form,
 * since 200 × 39 = 7800, so pre-existing lines are unaffected.
 */
export function calculateRequiredRolls(
  quantity: number,
  labelSizeMm: number,
  rollLength: number = DEFAULT_ROLL_LENGTH_M
): number {
  const length = rollLength > 0 ? rollLength : DEFAULT_ROLL_LENGTH_M;
  if (!(quantity > 0) || !(labelSizeMm > 0)) return 0;
  const labelsPerRoll = (length * 39) / (labelSizeMm / 25);
  if (!(labelsPerRoll > 0)) return 0;
  return quantity / labelsPerRoll;
}

/**
 * Total rolls issued = ROUNDUP(requiredRolls + extraRolls). Always a whole number —
 * a partial roll still consumes a whole roll from stock.
 */
export function calculateTotalRolls(requiredRolls: number, extraRolls: number): number {
  const extra = extraRolls > 0 ? extraRolls : 0;
  return Math.ceil(requiredRolls + extra);
}

/** Total weight of the issued rolls = weightPerRoll (from the material) * totalRollsIssued. */
export function calculateTotalWeight(weightPerRoll: number, totalRolls: number): number {
  if (!(weightPerRoll > 0) || !(totalRolls > 0)) return 0;
  return weightPerRoll * totalRolls;
}

/** Percentage of a line that has been packaged, rounded to two decimals.
 * Clamped to 100 — over-producing past the target does not exceed "complete". */
export function completionPct(packagedRolls: number, targetRolls: number): number {
  if (!(targetRolls > 0)) return 0;
  return Math.min(100, Math.round((packagedRolls / targetRolls) * 10000) / 100);
}

/**
 * Roll target stages are measured against for progress and completion.
 *
 * This is the `requiredRolls` figure (required rolls, excluding the manual
 * extra/buffer). When a line has no required breakdown (legacy rows with
 * requiredRolls = 0) the target falls back to `totalRolls`, so the old
 * total-issued semantics keep working. Over-producing *beyond* the target is
 * allowed — a stage simply stays Complete once it meets it.
 */
export function progressTargetOf(
  requiredRolls: number,
  totalRolls: number
): number {
  return requiredRolls > 0 ? requiredRolls : totalRolls;
}
