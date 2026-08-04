import { z } from "zod";

const denierEnum = z.enum(["45", "75", "100", "150"]);

/** One planned thread colour. All four fields are required — planning cannot be partial. */
const threadPlanItemSchema = z.object({
  sortOrder: z.coerce.number().int().min(1).max(8).optional(),
  colorName: z.string().trim().min(1, "Colour name is required"),
  denier: denierEnum,
  colorCode: z.string().trim().min(1, "Colour code is required"),
  weightKg: z.coerce.number().positive("Weight must be greater than zero"),
  threadStockId: z.coerce.number().int().positive().optional().nullable(),
});

/**
 * Woven planning. Total thread weight is deliberately absent — it is always summed
 * server-side from the colours, never accepted from the client.
 */
export const planWovenLineSchema = z.object({
  body: z.object({
    quantity: z.coerce.number().positive("Quantity must be greater than zero"),
    weavingMachineId: z.coerce.number().int().positive("A weaving machine is required"),
    weavingOperatorId: z.coerce.number().int().positive("A weaving operator is required"),
    threads: z
      .array(threadPlanItemSchema)
      .min(1, "At least one thread colour is required")
      .max(8, "A woven line can use at most 8 thread colours"),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

export const updateWeavingSchema = z.object({
  body: z.object({
    wovenQty: z.coerce.number().min(0).optional(),
    started: z.coerce.boolean().optional(),
    ended: z.coerce.boolean().optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

export const updateWovenCuttingSchema = z.object({
  body: z.object({
    cutQty: z.coerce.number().min(0).optional(),
    cuttingOperatorId: z.coerce.number().int().positive().optional(),
    cuttingDate: z.string().optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

export const updateWovenPackagingSchema = z.object({
  body: z.object({
    packagedQty: z.coerce.number().min(0).optional(),
    packagedWeightKg: z.coerce.number().min(0).optional(),
    packagingOperatorId: z.coerce.number().int().positive().optional(),
    packagingDate: z.string().optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

export const reconcileRemainingThreadsSchema = z.object({
  body: z.object({
    threads: z.array(
      z.object({
        id: z.coerce.number().int().positive(),
        remainingWeightKg: z.coerce.number().min(0, "Remaining weight cannot be negative"),
      })
    ),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

export type PlanWovenLineDTO = z.infer<typeof planWovenLineSchema>["body"];
export type UpdateWeavingDTO = z.infer<typeof updateWeavingSchema>["body"];
export type UpdateWovenCuttingDTO = z.infer<typeof updateWovenCuttingSchema>["body"];
export type UpdateWovenPackagingDTO = z.infer<typeof updateWovenPackagingSchema>["body"];
export type ReconcileRemainingThreadsDTO = z.infer<typeof reconcileRemainingThreadsSchema>["body"];
