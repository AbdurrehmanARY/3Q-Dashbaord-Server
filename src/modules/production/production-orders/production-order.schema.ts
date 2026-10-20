import { z } from "zod";

/** Roll counts and quantities are decimals; label size is in mm, roll length in metres. */
const sizePlanItemSchema = z.object({
  size: z.string().trim().min(1, "Size name is required").max(120),
  quantity: z.coerce
    .number({ invalid_type_error: "Enter a quantity" })
    .int("Size quantities are whole pieces")
    .positive("Size quantity must be greater than zero"),
});

const planLineSchema = z.object({
  labelType: z.string().trim().min(1, "Label type is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  /** Planned sizes of a Size Label — validated for quantity-sum by the service. */
  sizes: z.array(sizePlanItemSchema).max(50).optional(),
  labelSize: z.coerce.number().positive("Label size must be greater than zero"),
  rollLength: z.coerce.number().positive("Roll length must be greater than zero").optional(),
  extraRolls: z.coerce.number().min(0, "Extra rolls cannot be negative").optional(),
  /* Reserved on submit, so all three are required — see production-order.service.ts. */
  materialCode: z.string().trim().min(1, "Material is required"),
  /** Manual figure — the rolls drawn from inventory for this label type on save. */
  assignedRolls: z.coerce.number().min(0, "Assigned rolls cannot be negative").optional(),
  printingMachineId: z.coerce.number().int().positive().nullable().optional(),
  printingOperatorId: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().optional(),
});

export const createProductionOrderSchema = z.object({
  body: z.object({
    workOrderId: z.coerce.number().int().positive("A sales order is required"),
    notes: z.string().optional(),
    createdByUserId: z.coerce.number().int().positive().optional(),
  }),
});

export const updateProductionOrderSchema = z.object({
  body: z.object({
    notes: z.string().optional(),
    status: z.enum(["planned", "production", "complete"]).optional(),
  }),
});

/**
 * One label type, planned on its own. Required rolls, total rolls and total weight are
 * deliberately absent: they are always calculated server-side.
 */
export const planLineRequestSchema = z.object({
  body: planLineSchema.extend({
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

export const assignLineResourcesSchema = z.object({
  body: z.object({
    stage: z.enum(["printing", "cutting", "packaging"]),
    machineId: z.coerce.number().int().positive().nullable().optional(),
    operatorId: z.coerce.number().int().positive().nullable().optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

/** Cumulative absolute roll count for one stage — not a delta. */
export const updateStageProgressSchema = z.object({
  body: z.object({
    completed: z.coerce.number().min(0, "Completed rolls cannot be negative"),
    packagedQty: z.coerce.number().min(0, "Packaged quantity cannot be negative").optional(),
    note: z.string().optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

/** Delta: how many additional rolls are being handed to the next stage right now. */
export const transferRollsSchema = z.object({
  body: z.object({
    target: z.enum(["cutting", "packaging"]),
    rolls: z.coerce.number().positive("Transfer quantity must be greater than zero"),
    note: z.string().optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

/** Draws raw material from inventory onto a line. Delta, not an absolute total. */
export const issueRollsSchema = z.object({
  body: z.object({
    materialCode: z.string().trim().min(1).optional(),
    rolls: z.coerce.number().positive("Issued rolls must be greater than zero"),
    note: z.string().optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

/**
 * Full row edit for the inline production-progress table: every stage counter, the
 * packaged label quantity, and every machine/operator assignment in one call, all
 * fields optional so a save can send only what actually changed. Absolute values, not
 * deltas — the merged (existing + patch) result must form a consistent chain.
 */
export const updateLineFullSchema = z.object({
  body: z.object({
    printedRolls: z.coerce.number().min(0, "Cannot be negative").optional(),
    sentToCuttingRolls: z.coerce.number().min(0, "Cannot be negative").optional(),
    cutRolls: z.coerce.number().min(0, "Cannot be negative").optional(),
    sentToPackagingRolls: z.coerce.number().min(0, "Cannot be negative").optional(),
    packagedRolls: z.coerce.number().min(0, "Cannot be negative").optional(),
    packagedQty: z.coerce.number().min(0, "Cannot be negative").optional(),
    materialCode: z.string().trim().min(1).optional(),
    printingMachineId: z.coerce.number().int().positive().nullable().optional(),
    printingOperatorId: z.coerce.number().int().positive().nullable().optional(),
    cuttingMachineId: z.coerce.number().int().positive().nullable().optional(),
    cuttingOperatorId: z.coerce.number().int().positive().nullable().optional(),
    packagingOperatorId: z.coerce.number().int().positive().nullable().optional(),
    usedRolls: z.coerce.number().min(0, "Cannot be negative").optional(),
    usedWeight: z.coerce.number().min(0, "Cannot be negative").optional(),
    extraRollsReturned: z.coerce.number().min(0, "Cannot be negative").optional(),
    extraWeight: z.coerce.number().min(0, "Cannot be negative").optional(),
    note: z.string().optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

export const reconcileLineSchema = z.object({
  body: z.object({
    usedRolls: z.coerce.number().min(0, "Used rolls cannot be negative"),
    usedWeight: z.coerce.number().min(0, "Used weight cannot be negative"),
    extraRollsReturned: z.coerce.number().min(0, "Extra rolls returned cannot be negative"),
    extraWeight: z.coerce.number().min(0, "Extra weight cannot be negative"),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

export const createBatchSchema = z.object({
  body: z.object({
    stage: z.enum(["printing", "cutting", "packaging"]),
    machineId: z.coerce.number().int().positive().nullable().optional(),
    operatorId: z.coerce.number().int().positive().nullable().optional(),
    assignedRolls: z.coerce.number().min(0, "Assigned rolls cannot be negative").optional().default(0),
    quantity: z.coerce.number().min(0, "Batch quantity cannot be negative").optional().default(0),
    packagedQty: z.coerce.number().min(0, "Packaged quantity cannot be negative").optional().default(0),
    status: z.enum(["IN_PROGRESS", "COMPLETED"]).optional().default("IN_PROGRESS"),
    notes: z.string().optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

export const updateBatchSchema = z.object({
  body: z.object({
    assignedRolls: z.coerce.number().min(0, "Assigned rolls cannot be negative").optional(),
    quantity: z.coerce.number().min(0, "Batch quantity cannot be negative").optional(),
    packagedQty: z.coerce.number().min(0, "Packaged quantity cannot be negative").optional(),
    machineId: z.coerce.number().int().positive().nullable().optional(),
    operatorId: z.coerce.number().int().positive().nullable().optional(),
    status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
    notes: z.string().optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});


export type UpdateBatchDTO = z.infer<typeof updateBatchSchema>["body"];
export type CreateBatchDTO = z.infer<typeof createBatchSchema>["body"];
export type ReconcileLineDTO = z.infer<typeof reconcileLineSchema>["body"];
export type UpdateLineFullDTO = z.infer<typeof updateLineFullSchema>["body"];
export type IssueRollsDTO = z.infer<typeof issueRollsSchema>["body"];
export type CreateProductionOrderDTO = z.infer<typeof createProductionOrderSchema>["body"];
export type UpdateProductionOrderDTO = z.infer<typeof updateProductionOrderSchema>["body"];
export type PlanLineDTO = z.infer<typeof planLineRequestSchema>["body"];
export type AssignLineResourcesDTO = z.infer<typeof assignLineResourcesSchema>["body"];
export type UpdateStageProgressDTO = z.infer<typeof updateStageProgressSchema>["body"];
export type TransferRollsDTO = z.infer<typeof transferRollsSchema>["body"];

