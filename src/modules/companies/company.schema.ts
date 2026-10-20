import { z } from "zod";

export const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    location: z.string().min(1, "Location is required"),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
  }),
});

export const updateCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").optional(),
    email: z.string().email("Invalid email").optional(),
    location: z.string().min(1, "Location is required").optional(),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export type CreateCompanyDTO = z.infer<typeof createCompanySchema>['body'];
export type UpdateCompanyDTO = z.infer<typeof updateCompanySchema>['body'];
