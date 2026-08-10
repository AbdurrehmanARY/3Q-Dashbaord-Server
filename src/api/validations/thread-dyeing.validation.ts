import { z } from "zod";

const denierEnum = z.enum(["45", "75", "100", "150"]);
const baseColorEnum = z.enum(["White", "Black"]);

/**
 * Sending undyed thread out for dyeing. The sum of allocation weights must equal
 * `totalWeightSent` (enforced in the service). Sending deducts the total from Undyed
 * (primary) stock immediately.
 */
export const createDyeingSendSchema = z.object({
  body: z.object({
    serviceProviderId: z.coerce.number().int().positive("Service provider is required"),
    sendingDate: z.string().min(1, "Sending date is required"),
    senderTrackingNumber: z.string().trim().optional(),
    denier: denierEnum,
    baseThreadColor: baseColorEnum,
    totalWeightSent: z.coerce.number().positive("Total weight sent must be greater than 0"),
    allocations: z
      .array(
        z.object({
          colorName: z.string().trim().min(1, "Colour name is required"),
          pantone: z.string().trim().optional(),
          colorCode: z.string().trim().optional(),
          allocatedWeight: z.coerce.number().positive("Allocated weight must be greater than 0"),
        })
      )
      .min(1, "At least one colour allocation is required"),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

/**
 * Receiving dyed thread back. Per allocation the receiver finalises the colour code and
 * enters the actual dyed weight received (the "after" weight); that after-weight is what
 * gets credited to Dyed (secondary) stock, not the sent weight.
 */
export const receiveDyeingSchema = z.object({
  body: z.object({
    receivingDate: z.string().min(1, "Receiving date is required"),
    receiverTrackingNumber: z.string().trim().optional(),
    invoiceNumber: z.string().trim().optional(),
    allocations: z
      .array(
        z.object({
          id: z.coerce.number().int().positive(),
          colorCode: z.string().trim().optional(),
          receivedWeight: z.coerce.number().positive("Received weight must be greater than 0"),
        })
      )
      .min(1, "At least one colour must be received"),
    actorUserId: z.coerce.number().int().positive().optional(),
  }),
});

export type CreateDyeingSendDTO = z.infer<typeof createDyeingSendSchema>["body"];
export type ReceiveDyeingDTO = z.infer<typeof receiveDyeingSchema>["body"];
