import { z } from "zod";

/**
 * Batch request schemas.
 *
 * `assignedRolls` appears only on the printing schema and `sources` only on the consuming
 * one: a cutting batch's input is always the sum of its edges, never a figure a client can
 * type. Keeping them in separate schemas means an over-stated cutting input is not merely
 * rejected — it cannot be expressed.
 */

/**
 * Rolls are whole units — a roll is a physical object, so half a roll is not a quantity the
 * floor can hand over. Every roll figure in this file is an integer.
 */
const rolls = z.coerce
  .number()
  .int("Rolls must be a whole number")
  .positive("Rolls must be greater than zero")
  .max(1_000_000);
const optionalRolls = z.coerce
  .number()
  .int("Rolls must be a whole number")
  .min(0, "Rolls cannot be negative")
  .max(1_000_000);
/** Labels, unlike rolls, are counted in pieces. */
const labelQty = z.coerce.number().int().min(0).max(100_000_000);

/**
 * A required resource id. `z.coerce.number()` turns a missing value into NaN, which reports
 * as "expected number, received nan" — useless on a shop floor. Spelling the messages out
 * means the form says what to do instead of what the parser saw.
 */
const requiredResourceId = (what: string) =>
  z.coerce
    .number({ required_error: `Select a ${what}`, invalid_type_error: `Select a ${what}` })
    .int(`Select a ${what}`)
    .positive(`Select a ${what}`);
const actorUserId = z.coerce.number().int().positive().optional();

export const lineIdParamsSchema = z.object({
  lineId: z.coerce.number().int().positive("Invalid line id"),
});

export const batchIdParamsSchema = z.object({
  batchId: z.coerce.number().int().positive("Invalid batch id"),
});

/** One allocation from an upstream batch. */
const sourceAllocation = z.object({
  sourceBatchId: z.coerce.number().int().positive("Invalid source batch"),
  rolls,
});

/**
 * Printing draws from the plan.
 *
 * Machine and operator are REQUIRED, not optional: a batch is a real job on a real press,
 * and creating one without them produces a row nobody can act on.
 *
 * `labelSize` is a weaving-batch-only field — which planned size of a Size Label this
 * batch weaves. The repository refuses it anywhere else.
 */
export const createPrintingBatchSchema = z.object({
  body: z.object({
    assignedRolls: rolls,
    labelSize: z.string().trim().max(120).nullish(),
    machineId: requiredResourceId("machine"),
    operatorId: requiredResourceId("operator"),
    notes: z.string().max(1000).nullish(),
    actorUserId,
  }),
  params: lineIdParamsSchema,
});

/** Cutting and packaging draw from named upstream batches. */
export const createConsumingBatchSchema = z.object({
  body: z.object({
    sources: z
      .array(sourceAllocation)
      .min(1, "Select at least one source batch to consume from"),
    /** Cutting requires one; packaging is done by hand and rejects one. */
    machineId: z.coerce.number().int().positive().nullish(),
    operatorId: requiredResourceId("packaging operator"),
    notes: z.string().max(1000).nullish(),
    actorUserId,
  }),
  params: lineIdParamsSchema,
});

export const updateBatchSchema = z.object({
  body: z.object({
    assignedRolls: optionalRolls.optional(),
    labelSize: z.string().trim().max(120).nullish(),
    sources: z.array(sourceAllocation).min(1).optional(),
    machineId: z.coerce.number().int().positive().nullish(),
    operatorId: z.coerce.number().int().positive().nullish(),
    notes: z.string().max(1000).nullish(),
    actorUserId,
  }),
  params: batchIdParamsSchema,
});

/**
 * Absolute values, not deltas — "this batch has now made 6 rolls". `wastedRolls` is
 * accepted for every stage so the error message can explain why it is printing-only,
 * rather than the field silently vanishing.
 */
export const recordOutputSchema = z.object({
  body: z.object({
    producedRolls: optionalRolls.optional(),
    wastedRolls: optionalRolls.optional(),
    /** Optional reason the wasted rolls were scrapped — for yield reporting. */
    wasteReason: z.string().trim().max(200).nullish(),
    packagedQty: labelQty.optional(),
    actorUserId,
  }),
  params: batchIdParamsSchema,
});

export const batchActionSchema = z.object({
  body: z.object({ actorUserId }),
  params: batchIdParamsSchema,
});

export const listBatchesQuerySchema = z.object({
  stage: z.enum(["printing", "cutting", "packaging"]).optional(),
});

/** `batchId` keeps a batch's own current picks listed while it is being edited. */
export const stageResourcesQuerySchema = z.object({
  batchId: z.coerce.number().int().positive().optional(),
});

export type CreatePrintingBatchDTO = z.infer<typeof createPrintingBatchSchema>["body"];

export type CreateConsumingBatchDTO = z.infer<typeof createConsumingBatchSchema>["body"];
export type UpdateBatchDTO = z.infer<typeof updateBatchSchema>["body"];
export type RecordOutputDTO = z.infer<typeof recordOutputSchema>["body"];
