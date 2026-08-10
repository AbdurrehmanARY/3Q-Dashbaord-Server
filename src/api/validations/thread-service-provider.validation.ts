import { z } from "zod";

export const createThreadServiceProviderSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required"),
    contact: z.string().trim().max(100).optional(),
    address: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  }),
});

export const updateThreadServiceProviderSchema = z.object({
  body: createThreadServiceProviderSchema.shape.body.partial(),
});

export type CreateThreadServiceProviderDTO = z.infer<typeof createThreadServiceProviderSchema>["body"];
export type UpdateThreadServiceProviderDTO = z.infer<typeof updateThreadServiceProviderSchema>["body"];
