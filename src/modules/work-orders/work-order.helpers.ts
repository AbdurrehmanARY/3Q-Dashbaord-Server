/**
 * Estimated weaving time for a whole sales order — the single source of the formula
 * used by the work-order service (persisted) and, mirrored, by the client preview in
 * `WovenSpecification.tsx`.
 *
 *   hours = round2( (totalQty / repeat) * pick / (speed * 60) )
 *
 * `speed` (RPM) falls back to the facility default of 600 when unset or non-positive —
 * the same default production-order.repository.ts applies. Returns 0 when the inputs
 * cannot produce a meaningful estimate (repeat/pick/qty <= 0), so a half-filled form
 * never shows a bogus number.
 */
export function estimateWeavingHours(input: {
  totalQty: number;
  repeat: number | string;
  pick: number | string;
  speed?: number | string | null;
}): number {
  const qty = Number(input.totalQty) || 0;
  const repeatVal = Number(input.repeat) || 0;
  const pickVal = Number(input.pick) || 0;
  const speedRaw = Number(input.speed ?? 0);
  const speedVal = speedRaw > 0 ? speedRaw : 600;

  if (qty <= 0 || repeatVal <= 0 || pickVal <= 0) return 0;

  return Math.round(((qty / repeatVal) * pickVal) / (speedVal * 60) * 100) / 100;
}

