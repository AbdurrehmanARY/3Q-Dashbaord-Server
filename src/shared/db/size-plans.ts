/**
 * Shared shape for the planned sizes of a Size Label line.
 *
 * Lives at the db layer so the table definitions (`*_lines.sizes`) and the domain
 * services agree on exactly one contract, the way `productionStatusEnum` does.
 */

/** A planned size variant on a Size Label line: e.g. `{ size: "XL", quantity: 200 }`. */
export interface SizePlan {
  size: string;
  quantity: number;
}

/** The label types a production plan may split its order into. */
export const LABEL_TYPES = ["Size Label", "Care Label", "Main Label"] as const;

/**
 * "size label" regardless of case or surrounding spaces, so a legacy hand-typed value is
 * still recognised as a Size Label and given the size editor.
 */
export function isSizeLabel(labelType?: string | null) {
  return !!labelType && labelType.trim().toLowerCase() === "size label";
}

/**
 * Canonical form of a size so `" XL "`, `"xl"` and `"XL"` all compare equal.
 * Mirrors the `lower(trim(...))` comparison used in the batch-flow SQL guards, so the
 * remaining-quantity guard and the per-size board badges can never disagree.
 */
export function normalizeSize(size?: string | null) {
  return (size ?? "").trim().toLowerCase();
}