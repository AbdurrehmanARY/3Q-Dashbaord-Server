import { z } from "zod";

export const labelTypeEnum = z.enum(["woven", "printed"]);

export const createLabelTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less"),
    category: labelTypeEnum,
  }),
});

export const updateLabelTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less").optional(),
    category: labelTypeEnum.optional(),
    isActive: z.boolean().optional(),
  }),
});

export const labelTypeParamsSchema = z.object({
  id: z.coerce.number().int().positive("ID must be a positive integer"),
});

export const labelTypesQuerySchema = z.object({
  category: labelTypeEnum.optional(),
  activeOnly: z.coerce.boolean().optional(),
});

/* ---------- Type exports for service ---------- */
export type CreateLabelTypeDTO = z.infer<typeof createLabelTypeSchema>["body"];
export type UpdateLabelTypeDTO = z.infer<typeof updateLabelTypeSchema>["body"];