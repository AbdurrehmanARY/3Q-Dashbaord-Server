import { z } from "zod";

export const listMaterialsQuerySchema = z.object({
  type: z.string().optional(),
  includeInactive: z.coerce.boolean().optional(),
});

export const listMachinesQuerySchema = z.object({
  type: z.string().optional(),
  includeInactive: z.coerce.boolean().optional(),
});

export const listOperatorsQuerySchema = z.object({
  designation: z.string().optional(),
  /** Capability filter used by production: matches the line plus `both`. */
  productType: z.enum(["printed", "woven"]).optional(),
  /** Exact match, for the operator master-data list's own filter. */
  operatorType: z.enum(["printed", "woven", "both"]).optional(),
  search: z.string().optional(),
  includeInactive: z.coerce.boolean().optional(),
});

export const listCompaniesQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional(),
});

export type ListMachinesQueryDTO = z.infer<typeof listMachinesQuerySchema>;
export type ListOperatorsQueryDTO = z.infer<typeof listOperatorsQuerySchema>;
export type ListCompaniesQueryDTO = z.infer<typeof listCompaniesQuerySchema>;

export const listWorkOrdersQuerySchema = z.object({
  soNumber: z.string().optional(),
  poNumber: z.string().optional(),
  status: z.enum(["initiate_production", "production", "complete"]).optional(),
  /** Filters the shared list down to one workflow. Omitted = both. */
  productType: z.enum(["printed", "woven"]).optional(),
  /** Dispatch paperwork is searchable. */
  dcNumber: z.string().optional(),
  lcNumber: z.string().optional(),
  /** Woven-only search. */
  designCode: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const listProductionOrdersQuerySchema = z.object({
  status: z.string().optional(),
  soNumber: z.string().optional(),
  poNumber: z.string().optional(),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(["office_staff", "production_manager", "production_operator"]).optional(),
  includeInactive: z.coerce.boolean().optional(),
});

export type ListUsersQueryDTO = z.infer<typeof listUsersQuerySchema>;

export const listPurchasesQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  vendor: z.string().optional(),
  materialCode: z.string().optional(),
});

export const listStockQuerySchema = z.object({
  materialCode: z.string().optional(),
  type: z.string().optional(),
});

export type ListMaterialsQueryDTO = z.infer<typeof listMaterialsQuerySchema>;
export type ListWorkOrdersQueryDTO = z.infer<typeof listWorkOrdersQuerySchema>;
export type ListProductionOrdersQueryDTO = z.infer<typeof listProductionOrdersQuerySchema>;
export type ListPurchasesQueryDTO = z.infer<typeof listPurchasesQuerySchema>;
export type ListStockQueryDTO = z.infer<typeof listStockQuerySchema>;
