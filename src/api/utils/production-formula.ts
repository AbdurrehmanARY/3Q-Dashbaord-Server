/**
 * Canonical roll-planning arithmetic. This is the single source of truth for the
 * project — the client mirrors it for live preview only, and the values persisted on
 * a production order line are always the ones computed here.
 */

/**
 * Rolls required to produce `quantity` labels (fractional; stored with decimal precision).
 *
 *   requiredRolls = quantity / (7800 / (labelSizeMm / 25))
 *
 * i.e. labels-per-roll = 7800 / (labelSizeMm / 25), and requiredRolls = quantity / labelsPerRoll.
 * Roll length is deliberately NOT a factor — this formula replaced the earlier
 * length-based one.
 */
export function calculateRequiredRolls(quantity: number, labelSizeMm: number): number {
  if (!(quantity > 0) || !(labelSizeMm > 0)) return 0;
  const labelsPerRoll = 7800 / (labelSizeMm / 25);
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

/** Percentage of a line that has been packaged, rounded to two decimals. */
export function completionPct(packagedRolls: number, totalRolls: number): number {
  if (!(totalRolls > 0)) return 0;
  return Math.round((packagedRolls / totalRolls) * 10000) / 100;
}
