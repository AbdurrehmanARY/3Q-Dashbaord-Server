import { z } from "zod";

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
  extra: z.coerce.number().min(0, "Extra cannot be negative").optional(),
});

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
      /** Artwork / reference image URL, rendered on the detail page. */
      imageUrl: z.string().trim().url("Image must be a valid URL").max(2048).optional().or(z.literal("")),
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
    imageUrl: z.string().trim().url("Image must be a valid URL").max(2048).optional().or(z.literal("")),
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
  }),
});

export type CreateWorkOrderDTO = z.infer<typeof createWorkOrderSchema>['body'];
export type UpdateWorkOrderDTO = z.infer<typeof updateWorkOrderSchema>['body'];
export type DispatchWorkOrderDTO = z.infer<typeof dispatchWorkOrderSchema>['body'];
export type WovenDetailDTO = z.infer<typeof wovenDetailSchema>;
