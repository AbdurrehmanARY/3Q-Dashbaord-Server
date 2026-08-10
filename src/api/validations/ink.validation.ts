import { z } from "zod";

/**
 * `totalWeight` is deliberately absent from both purchase schemas — it is always
 * server-calculated (`quantity × weightPerQty`). A client that sends it has it dropped.
 */
export const createInkPurchaseSchema = z.object({
  body: z.object({
    reportDate: z.string().min(1, "Report date is required"),
    materialCode: z.string().trim().min(1, "Material code is required"),
    vendor: z.string().trim().min(1, "Vendor is required"),
    invoiceNumber: z.string().trim().optional(),
    quantity: z.coerce.number().positive("Quantity must be greater than 0"),
    weightPerQty: z.coerce.number().positive("Weight per quantity must be greater than 0"),
  }),
});

export const updateInkPurchaseSchema = z.object({
  body: z.object({
    reportDate: z.string().min(1).optional(),
    materialCode: z.string().trim().min(1).optional(),
    vendor: z.string().trim().min(1).optional(),
    invoiceNumber: z.string().trim().optional(),
    quantity: z.coerce.number().positive().optional(),
    weightPerQty: z.coerce.number().positive().optional(),
  }),
});

export const createInkConsumptionSchema = z.object({
  body: z.object({
    materialCode: z.string().trim().min(1, "Material code is required"),
    qtyAssigned: z.coerce.number().positive("Quantity assigned must be greater than 0"),
    operatorId: z.coerce.number().int().positive().optional(),
    operatorName: z.string().trim().optional(),
    weight: z.coerce.number().positive("Weight must be greater than 0"),
    note: z.string().trim().optional(),
  }),
});

export type CreateInkPurchaseDTO = z.infer<typeof createInkPurchaseSchema>["body"];
export type UpdateInkPurchaseDTO = z.infer<typeof updateInkPurchaseSchema>["body"];
export type CreateInkConsumptionDTO = z.infer<typeof createInkConsumptionSchema>["body"];
