import { z } from "zod";

/**
 * Artwork accepts either an uploaded image (stored inline as a base64 `data:` URI —
 * the file-upload path) or an external `http(s)` URL. The column is `text`, so the
 * generous size cap (~4 MB of base64 ≈ a ~3 MB source image) is the only guard.
 */
export const artworkImageSchema = z
  .string()
  .trim()
  .max(4_000_000, "Image is too large — keep it under about 3 MB")
  .refine(
    (v) => v === "" || /^data:image\/[\w.+-]+;base64,/.test(v) || /^https?:\/\/.+/i.test(v),
    "Artwork must be an uploaded image or a valid image URL"
  )
  .optional();

/**
 * A sales order carries only its commercial header. The label-type breakdown
 * (label type, quantity, label size, roll length) belongs to the production order
 * and is entered by the production manager during planning.
 */
/** Woven orders additionally carry the loom specification; printed orders never do. */
export const wovenDetailSchema = z.object({
  designCode: z.string().trim().min(1, "Design code is required"),
  pick: z.coerce.number().int().positive("Pick must be greater than 0"),
  repeat: z.coerce.number().positive("Repeat must be greater than 0"),
  density: z.coerce.number().int().positive("Density must be greater than 0"),
  speed: z.coerce.number().min(0, "Speed must be non-negative").optional().default(0),
  extra: z.coerce.number().min(0, "Extra cannot be negative").optional(),
  /** Size labels woven on this order, e.g. ["10", "12", "XL", "34/34"]. */
  sizeLabels: z.array(z.string().trim().min(1)).optional(),
});

/** Scheduling priority and reason-for-order — set on any order, woven or printed. */
export const WORK_ORDER_PRIORITIES = ["normal", "urgent", "emergency"] as const;
export const WORK_ORDER_TYPES = ["normal order", "shortfall", "additional order", "recut order"] as const;
export const prioritySchema = z.enum(WORK_ORDER_PRIORITIES).default("normal");
export const orderTypeSchema = z.enum(WORK_ORDER_TYPES).default("normal order");

export const createWorkOrderSchema = z.object({
  body: z
    .object({
      soNumber: z.string().min(1, "SO Number is required"),
      poNumber: z.string().optional(),
      orderDate: z.string().optional(),
      dueDate: z.string().optional(),
      totalQty: z.coerce.number().int().positive("Total quantity must be greater than 0"),
      brandId: z.coerce.number().int().positive("Brand ID must be a positive integer").optional(),
      comment: z.string().optional(),
      priority: prioritySchema,
      orderType: orderTypeSchema,
      /** Artwork image — uploaded file (base64 data URI) or external URL. */
      imageUrl: artworkImageSchema,
      /** DC-copy image — captured alongside artwork during dispatch. */
      dcImageUrl: artworkImageSchema,
      productType: z.enum(["printed", "woven"]).default("printed"),
      /** Required when `productType` is `woven`, rejected otherwise (see refine below). */
      wovenDetail: wovenDetailSchema.optional(),
    })
    .refine((v) => v.productType !== "woven" || v.wovenDetail !== undefined, {
      message: "Woven work orders require the design specification (design code, pick, repeat, density)",
      path: ["wovenDetail"],
    }),
});

export const updateWorkOrderSchema = z.object({
  body: z.object({
    poNumber: z.string().optional(),
    dueDate: z.string().optional(),
    totalQty: z.coerce.number().int().positive().optional(),
    brandId: z.coerce.number().int().positive().optional(),
    comment: z.string().optional(),
    priority: prioritySchema.optional(),
    orderType: orderTypeSchema.optional(),
    imageUrl: artworkImageSchema,
    dcImageUrl: artworkImageSchema,
    // `status` and `productType` are deliberately absent: status is derived from the
    // production order, and a sales order cannot change which workflow it runs through.
    dcNumber: z.string().optional(),
    lcNumber: z.string().optional(),
    fbrInvoiceNumber: z.string().optional(),
    dispatchedDate: z.string().optional(),
    dispatchedQty: z.coerce.number().int().positive().optional(),
    /** Loom spec edits for a woven order (only while it is still editable). */
    wovenDetail: wovenDetailSchema.partial().optional(),
  }),
});

/**
 * Completing a dispatch. DC Number and LC Number are both mandatory here — that is the
 * whole point of the endpoint, and it is why they are `min(1)` rather than optional.
 */
export const dispatchWorkOrderSchema = z.object({
  body: z.object({
    dcNumber: z.string().trim().min(1, "DC Number is required to dispatch"),
    lcNumber: z.string().trim().min(1, "LC Number is required to dispatch"),
    fbrInvoiceNumber: z.string().trim().min(1, "FBR Invoice Number is required to dispatch"),
    dispatchedDate: z.string().min(1, "Dispatch date is required"),
    dispatchedQty: z.coerce.number().int().positive("Dispatch quantity must be greater than 0"),
    imageUrl: artworkImageSchema,
    dcImageUrl: artworkImageSchema,
  }),
});

export type CreateWorkOrderDTO = z.infer<typeof createWorkOrderSchema>['body'];
export type UpdateWorkOrderDTO = z.infer<typeof updateWorkOrderSchema>['body'];
export type DispatchWorkOrderDTO = z.infer<typeof dispatchWorkOrderSchema>['body'];
export type WovenDetailDTO = z.infer<typeof wovenDetailSchema>;
