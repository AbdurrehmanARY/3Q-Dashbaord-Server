/**
 * Canonical purchase-record arithmetic. This is the single source of truth — the client
 * mirrors these for live preview only, and the values persisted on a purchase record are
 * always the ones computed here.
 */

/**
 * Total rolls received, standardized to a 200m roll length.
 *
 *   totalRollPer200m = totalRoll * (rollLength / 200)
 *
 * Example: 10 rolls at 400m each = 10 * (400/200) = 20.
 */
export function calculateTotalRollPer200m(totalRoll: number, rollLengthM: number): number {
  if (!(totalRoll > 0) || !(rollLengthM > 0)) return 0;
  return totalRoll * (rollLengthM / 200);
}

/**
 * Net weight standardized to a 200m roll length.
 *
 *   invoiceWeight = (netWeight * 200) / (totalRoll * rollLength)
 */
export function calculateInvoiceWeight(netWeight: number, totalRoll: number, rollLengthM: number): number {
  if (!(netWeight > 0) || !(totalRoll > 0) || !(rollLengthM > 0)) return 0;
  return (netWeight * 200) / (totalRoll * rollLengthM);
}
