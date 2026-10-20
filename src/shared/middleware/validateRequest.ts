import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "@shared/errors/ApiError";

declare global {
  namespace Express {
    interface Request {
      validatedBody?: any;
      validatedQuery?: any;
      validatedParams?: any;
    }
  }
}

export function validateRequest<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as Record<string, unknown>;
      // Only assign the sections the schema actually declared, so chaining a separate
      // `validateParams(...)` (for a body-only schema) isn't clobbered with `undefined`.
      if ("body" in parsed) req.validatedBody = parsed.body;
      if ("query" in parsed) req.validatedQuery = parsed.query;
      if ("params" in parsed) req.validatedParams = parsed.params;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        next(new ApiError(message, 400));
        return;
      }
      next(error);
    }
  };
}

export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.validatedQuery = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        next(new ApiError(message, 400));
        return;
      }
      next(error);
    }
  };
}

export function validateParams<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.validatedParams = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        next(new ApiError(message, 400));
        return;
      }
      next(error);
    }
  };
}
