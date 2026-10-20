import { z } from "zod";

export const createMaterialSchema = z.object({
  body: z.object({
    code: z.string().min(1, "Code is required"),
    type: z.string().min(1, "Type is required"),
    description: z.string().optional(),
    weightPerRoll: z.coerce.number().positive("Weight per roll must be positive"),
    minStockLevel: z.coerce.number().int().min(0).optional(),
    reorderQty: z.coerce.number().int().min(0).optional(),
  }),
});

export const updateMaterialSchema = z.object({
  body: z.object({
    code: z.string().optional(),
    type: z.string().min(1, "Type is required").optional(),
    description: z.string().optional(),
    weightPerRoll: z.coerce.number().positive("Weight per roll must be positive").optional(),
    minStockLevel: z.coerce.number().int().min(0).optional(),
    reorderQty: z.coerce.number().int().min(0).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export type CreateMaterialDTO = z.infer<typeof createMaterialSchema>['body'];
export type UpdateMaterialDTO = z.infer<typeof updateMaterialSchema>['body'];
