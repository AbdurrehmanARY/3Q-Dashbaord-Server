import { z } from "zod";

const denierEnum = z.enum(["45", "75", "100", "150"]);
const baseColorEnum = z.enum(["White", "Black"]);

/**
 * Thread receiving. `totalWeightKg` is deliberately absent — it is always calculated
 * server-side as `weightPerCtnKg × totalCtns`, mirroring the printed purchase formulas.
 */
export const createThreadPurchaseSchema = z.object({
  body: z.object({
    receivedDate: z.string().min(1, "Received date is required"),
    denier: denierEnum,
    threadColor: baseColorEnum,
    vendor: z.string().trim().min(1, "Vendor is required"),
    invoiceNumber: z.string().trim().min(1, "Invoice number is required"),
    totalCtns: z.coerce.number().int().positive("Total cartons must be greater than 0"),
    weightPerCtnKg: z.coerce.number().positive("Weight per carton must be greater than 0"),
    notes: z.string().optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

/** Converts undyed primary stock into dyed secondary stock. */
export const createDyeBatchSchema = z.object({
  body: z.object({
    denier: denierEnum,
    fromColorName: baseColorEnum,
    toColorName: z.string().trim().min(1, "Colour name is required"),
    toColorCode: z.string().trim().min(1, "Colour code is required"),
    inputWeightKg: z.coerce.number().positive("Input weight must be greater than 0"),
    outputWeightKg: z.coerce.number().positive("Output weight must be greater than 0"),
    notes: z.string().optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

/** Creating a thread ledger by hand (receiving and dyeing create them implicitly). */
export const createThreadStockSchema = z.object({
  body: z.object({
    stockType: z.enum(["primary", "secondary"]),
    denier: denierEnum,
    colorName: z.string().trim().min(1, "Colour name is required"),
    /** Required for dyed (secondary) stock; ignored for undyed. */
    colorCode: z.string().trim().optional().nullable(),
    openingKg: z.coerce.number().min(0, "Opening balance cannot be negative").optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

/** Balance is bounded at zero; changing it writes an adjustment movement. */
export const updateThreadStockSchema = z.object({
  body: z.object({
    colorName: z.string().trim().min(1).optional(),
    colorCode: z.string().trim().optional().nullable(),
    balanceKg: z.coerce.number().min(0, "Balance cannot be negative").optional(),
    note: z.string().max(500).optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

export const listThreadStocksQuerySchema = z.object({
  stockType: z.enum(["primary", "secondary"]).optional(),
  denier: denierEnum.optional(),
  colorName: z.string().optional(),
});

export const listThreadPurchasesQuerySchema = z.object({
  vendor: z.string().optional(),
  denier: denierEnum.optional(),
});

export const listThreadMovementsQuerySchema = z.object({
  threadStockId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type CreateThreadPurchaseDTO = z.infer<typeof createThreadPurchaseSchema>["body"];
export type CreateDyeBatchDTO = z.infer<typeof createDyeBatchSchema>["body"];
