import { z } from "zod";

export const createMachineSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    machineCode: z.string().min(1, "Machine code is required"),
    machineName: z.string().min(1, "Machine name is required"),
    machineType: z.enum(["Printing", "Woven", "Cutting", "Packaging", "Other"]).default("Other"),
    productType: z.enum(["printed", "woven", "both"]).default("both"),
    machineOperatorId: z.coerce.number().int().positive().optional(),
    capacityPerHour: z.coerce.number().int().min(0).optional(),
    status: z.enum(["Active", "Inactive"]).default("Active"),
  }),
});

export const updateMachineSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").optional(),
    machineCode: z.string().min(1, "Machine code is required").optional(),
    machineName: z.string().min(1, "Machine name is required").optional(),
    machineType: z.enum(["Printing", "Woven", "Cutting", "Packaging", "Other"]).optional(),
    productType: z.enum(["printed", "woven", "both"]).optional(),
    machineOperatorId: z.coerce.number().int().positive().optional(),
    capacityPerHour: z.coerce.number().int().min(0).optional(),
    status: z.enum(["Active", "Inactive"]).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export type CreateMachineDTO = z.infer<typeof createMachineSchema>['body'];
export type UpdateMachineDTO = z.infer<typeof updateMachineSchema>['body'];
