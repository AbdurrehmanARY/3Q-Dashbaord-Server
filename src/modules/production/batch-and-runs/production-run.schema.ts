import { z } from "zod";

export const RUN_REASONS = [
  "initial",
  "shortfall",
  "additional_order",
  "recut",
  "rework",
  "retry",
  "other",
] as const;

/**
 * Logging a production pass. `quantityProduced` must be positive. `idempotencyKey` lets a
 * client make submission retries safe — the same key returns the same run instead of a
 * second insert.
 */
export const createProductionRunSchema = z.object({
  body: z.object({
    productId: z.string().trim().max(150).optional(),
    machineId: z.coerce.number().int().positive().optional(),
    operatorId: z.coerce.number().int().positive().optional(),
    quantityProduced: z.coerce.number().positive("Quantity produced must be greater than 0"),
    runReason: z.enum(RUN_REASONS).default("initial"),
    notes: z.string().max(1000).optional(),
    idempotencyKey: z.string().max(100).optional(),
    createdBy: z.coerce.number().int().positive().optional(),
  }),
});

export const saleOrderParamsSchema = z.object({
  saleOrderId: z.coerce.number().int().positive("A valid numeric sale order id is required"),
});

export type CreateProductionRunDTO = z.infer<typeof createProductionRunSchema>["body"];
