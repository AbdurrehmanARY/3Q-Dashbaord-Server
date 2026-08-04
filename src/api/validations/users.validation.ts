import { z } from "zod";

export const userRoleSchema = z.enum(["office_staff", "production_manager", "production_operator"]);

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required"),
    employeeCode: z.string().optional(),
    email: z.string().email("Must be a valid email").optional(),
    role: userRoleSchema,
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    employeeCode: z.string().optional(),
    email: z.string().email("Must be a valid email").optional(),
    role: userRoleSchema.optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>["body"];
export type UpdateUserDTO = z.infer<typeof updateUserSchema>["body"];
