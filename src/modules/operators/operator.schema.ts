import { z } from "zod";

/**
 * `operatorType` is which product line the operator is trained for, and is distinct from
 * `designation` (which stage they work). Production pickers filter on it: a printed job
 * offers `printed` + `both`, a woven job offers `woven` + `both`. It defaults to `both` so
 * an operator entered without one stays visible everywhere rather than silently vanishing
 * from every picker.
 *
 * `avatarUrl` is a plain URL for now — swapping in a Cloudinary-hosted URL later changes
 * only how the URL is produced, not this contract.
 */
const operatorTypeEnum = z.enum(["printed", "woven", "both"]);
const avatarUrlSchema = z
  .string()
  .trim()
  .max(1000000)
  .optional()
  .or(z.literal(""));

export const createOperatorSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    employeeCode: z.string().optional(),
    designation: z.enum(["Printing", "Weaving", "Cutting", "Packaging"]).default("Printing"),
    operatorType: operatorTypeEnum.default("both"),
    avatarUrl: avatarUrlSchema,
    shift: z.string().optional(),
    status: z.enum(["Active", "Inactive"]).default("Active"),
  }),
});

export const updateOperatorSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").optional(),
    employeeCode: z.string().optional(),
    designation: z.enum(["Printing", "Weaving", "Cutting", "Packaging"]).optional(),
    operatorType: operatorTypeEnum.optional(),
    avatarUrl: avatarUrlSchema,
    shift: z.string().optional(),
    status: z.enum(["Active", "Inactive"]).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export type CreateOperatorDTO = z.infer<typeof createOperatorSchema>["body"];
export type UpdateOperatorDTO = z.infer<typeof updateOperatorSchema>["body"];
