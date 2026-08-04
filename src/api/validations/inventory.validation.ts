import { z } from "zod";

/**
 * `totalRoll`, `totalRollPer200m`, `invoiceWeight` and `localWeight` are all derived
 * server-side (see `inventory.service.ts` / `purchase-formula.ts`) and are deliberately
 * absent here — a client-supplied value for any of them is never trusted.
 */
export const createPurchaseSchema = z.object({
  body: z.object({
    reportDate: z.string().min(1, "Report date is required"),
    materialCode: z.string().min(1, "Material code is required"),
    invoiceNumber: z.string().min(1, "Invoice number is required"),
    vendor: z.string().min(1, "Vendor is required"),
    cartonQty: z.coerce.number().int().positive("Carton quantity must be positive"),
    rollsPerCarton: z.coerce.number().int().positive("Rolls per carton must be positive"),
    rollLength: z.coerce.number().positive("Roll length must be positive"),
    netWeight: z.coerce.number().positive("Net weight must be positive"),
    efs: z.string().optional(),
    gdNumber: z.string().optional(),
  }),
});

export type CreatePurchaseDTO = z.infer<typeof createPurchaseSchema>['body'];

export const updatePurchaseSchema = z.object({
  body: z.object({
    reportDate: z.string().min(1, "Report date is required").optional(),
    materialCode: z.string().min(1, "Material code is required").optional(),
    invoiceNumber: z.string().min(1, "Invoice number is required").optional(),
    vendor: z.string().min(1, "Vendor is required").optional(),
    cartonQty: z.coerce.number().int().positive("Carton quantity must be positive").optional(),
    rollsPerCarton: z.coerce.number().int().positive("Rolls per carton must be positive").optional(),
    rollLength: z.coerce.number().positive("Roll length must be positive").optional(),
    netWeight: z.coerce.number().positive("Net weight must be positive").optional(),
    efs: z.string().optional(),
    gdNumber: z.string().optional(),
  }),
});

export type UpdatePurchaseDTO = z.infer<typeof updatePurchaseSchema>['body'];
