import { z } from "zod";

export const createBrandSchema = z.object({
  body: z.object({
    companyId: z.coerce.number().int().positive("Company is required"),
    name: z.string().min(1, "Name is required"),
  }),
});

export const updateBrandSchema = z.object({
  body: z.object({
    companyId: z.coerce.number().int().positive().optional(),
    name: z.string().min(1, "Name is required").optional(),
  }),
});

export type CreateBrandDTO = z.infer<typeof createBrandSchema>['body'];
export type UpdateBrandDTO = z.infer<typeof updateBrandSchema>['body'];
