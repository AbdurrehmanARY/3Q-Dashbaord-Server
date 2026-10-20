import { z } from "zod";

/**
 * Roll ledger writes.
 *
 * `balanceRolls` is deliberately absent from both schemas: it is always derived server-side
 * as `opening + received - issued`, so accepting it would let the inputs and the balance
 * disagree. Every stock figure is bounded at zero — negative physical stock is not a state
 * the ledger can represent.
 */
export const createInventoryRollSchema = z.object({
  body: z.object({
    materialCode: z.string().trim().min(1, "Material code is required"),
    openingStock: z.coerce.number().min(0, "Opening stock cannot be negative").optional(),
    receivedRolls: z.coerce.number().min(0, "Received rolls cannot be negative").optional(),
    issuedRolls: z.coerce.number().min(0, "Issued rolls cannot be negative").optional(),
    rollPerKg: z.coerce.number().min(0, "Rolls per kg cannot be negative").optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

export const updateInventoryRollSchema = z.object({
  body: z.object({
    openingStock: z.coerce.number().min(0, "Opening stock cannot be negative").optional(),
    receivedRolls: z.coerce.number().min(0, "Received rolls cannot be negative").optional(),
    issuedRolls: z.coerce.number().min(0, "Issued rolls cannot be negative").optional(),
    rollPerKg: z.coerce.number().min(0, "Rolls per kg cannot be negative").optional(),
    /** Reason for the adjustment — recorded on the movement row. */
    note: z.string().max(500).optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

// Flat (not wrapped) because `validateParams` parses `req.params` directly.
export const inventoryRollParamsSchema = z.object({
  materialCode: z.string().min(1, "Material code is required"),
});

/** List controls: search, filter, sort and page. */
export const listInventoryRollsQuerySchema = z.object({
  materialCode: z.string().optional(),
  search: z.string().optional(),
  type: z.string().optional(),
  stockStatus: z.enum(["in", "low", "out"]).optional(),
  sortBy: z
    .enum(["materialCode", "balanceRolls", "receivedRolls", "issuedRolls", "updatedAt"])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const listRollMovementsQuerySchema = z.object({
  materialCode: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type CreateInventoryRollDTO = z.infer<typeof createInventoryRollSchema>["body"];
export type UpdateInventoryRollDTO = z.infer<typeof updateInventoryRollSchema>["body"];
