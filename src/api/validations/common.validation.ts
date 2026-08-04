import { z } from "zod";

/**
 * Flat route-param schemas for `validateParams(...)`, which parses `req.params` directly
 * (so these must be flat objects, NOT wrapped in `{ params: … }`). Coerces the string path
 * segment to a positive integer and rejects `/resource/abc` with a clean 400 up front,
 * rather than letting `Number("abc") = NaN` fall through to a 404 later.
 */
export const idParamsSchema = z.object({
  id: z.coerce.number().int().positive("A valid numeric id is required"),
});

export const lineIdParamsSchema = z.object({
  lineId: z.coerce.number().int().positive("A valid numeric line id is required"),
});

export const companyIdParamsSchema = z.object({
  companyId: z.coerce.number().int().positive("A valid numeric company id is required"),
});

/** Optional pagination for append-only history endpoints. Applied via `validateQuery`. */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
