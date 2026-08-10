import { z } from "zod";

/* ---------------- Sticker materials ---------------- */
// totalWeight is always server-calculated (rollQuantity × weightPerRoll) — never accepted.
export const createStickerMaterialSchema = z.object({
  body: z.object({
    invoiceDate: z.string().min(1, "Invoice date is required"),
    stickerSize: z.string().trim().min(1, "Sticker size is required"),
    materialCode: z.string().trim().min(1, "Material code is required"),
    rollQuantity: z.coerce.number().positive("Roll quantity must be greater than 0"),
    weightPerRoll: z.coerce.number().positive("Weight per roll must be greater than 0"),
  }),
});
export const updateStickerMaterialSchema = z.object({
  body: createStickerMaterialSchema.shape.body.partial(),
});

/* ---------------- Local sheets ---------------- */
// totalWeight = packetQuantity × packetWeight.
export const createLocalSheetSchema = z.object({
  body: z.object({
    date: z.string().min(1, "Date is required"),
    materialCode: z.string().trim().min(1, "Material code is required"),
    packetQuantity: z.coerce.number().positive("Packet quantity must be greater than 0"),
    packetWeight: z.coerce.number().positive("Packet weight must be greater than 0"),
  }),
});
export const updateLocalSheetSchema = z.object({
  body: createLocalSheetSchema.shape.body.partial(),
});

/* ---------------- Label sheets ---------------- */
// totalWeight = sheetQuantity × weightPerSheet.
export const createLabelSheetSchema = z.object({
  body: z.object({
    date: z.string().min(1, "Date is required"),
    materialCode: z.string().trim().min(1, "Material code is required"),
    sheetQuantity: z.coerce.number().positive("Sheet quantity must be greater than 0"),
    weightPerSheet: z.coerce.number().positive("Weight per sheet must be greater than 0"),
  }),
});
export const updateLabelSheetSchema = z.object({
  body: createLabelSheetSchema.shape.body.partial(),
});

export type CreateStickerMaterialDTO = z.infer<typeof createStickerMaterialSchema>["body"];
export type UpdateStickerMaterialDTO = z.infer<typeof updateStickerMaterialSchema>["body"];
export type CreateLocalSheetDTO = z.infer<typeof createLocalSheetSchema>["body"];
export type UpdateLocalSheetDTO = z.infer<typeof updateLocalSheetSchema>["body"];
export type CreateLabelSheetDTO = z.infer<typeof createLabelSheetSchema>["body"];
export type UpdateLabelSheetDTO = z.infer<typeof updateLabelSheetSchema>["body"];
