import { ApiError } from "@shared/errors/ApiError";
import { isSizeLabel, type SizePlan } from "@db/size-plans";

export { LABEL_TYPES, isSizeLabel, type SizePlan } from "@db/size-plans";

/**
 * Normalises and validates a size plan against its line quantity.
 *
 * `undefined` is fine for non-size lines; a Size Label must carry at least one size and
 * the sizes must add up to the line's planned quantity exactly — that equality is what
 * makes "remaining per size" a figure the floor can act on (see `lineFlowOf.sizes`).
 */
export function validateSizePlan(
  sizes: SizePlan[] | undefined,
  labelType: string,
  quantity: number,
  where = "this label type"
): SizePlan[] {
  const plan = normalizeSizePlan(sizes);
  if (!isSizeLabel(labelType)) return plan;

  if (plan.length === 0) {
    throw new ApiError(
      `'${labelType.trim()}' is a Size Label — plan at least one size for ${where}`,
      400
    );
  }
  const total = plan.reduce((n, s) => n + s.quantity, 0);
  if (Math.abs(total - quantity) > 0.0005) {
    throw new ApiError(
      `The planned sizes for ${where} add up to ${total} pcs, but the line is planned for ${quantity} pcs`,
      400
    );
  }
  return plan;
}

/** Trims size names, rejects empties, duplicates and non-positive quantities. */
export function normalizeSizePlan(sizes: SizePlan[] | undefined): SizePlan[] {
  if (!sizes || sizes.length === 0) return [];
  if (sizes.length > 50) throw new ApiError("A label type can plan at most 50 sizes", 400);

  const seen = new Set<string>();
  const out: SizePlan[] = [];
  for (const s of sizes) {
    const size = (s.size ?? "").trim();
    const qty = Number(s.quantity ?? 0);
    if (!size) throw new ApiError("Every planned size needs a name — 'XL', '32/32', …", 400);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ApiError(`Size '${size}' needs a positive whole-number quantity`, 400);
    }
    if (seen.has(size.toLowerCase())) {
      throw new ApiError(`Size '${size}' is listed twice — plan it as one row`, 400);
    }
    seen.add(size.toLowerCase());
    out.push({ size, quantity: qty });
  }
  return out;
}