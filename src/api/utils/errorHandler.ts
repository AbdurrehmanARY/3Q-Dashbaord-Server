import { Request, Response, NextFunction } from "express";
import { ApiError } from "./ApiError";
import { logger } from "@config/logger";

export function notFound(req: Request, res: Response, next: NextFunction): void {
  const error = new ApiError(`Not found - ${req.originalUrl}`, 404);
  next(error);
}

/** postgres-js surfaces the SQLSTATE code on `err.code` (e.g. "23505" unique_violation). */
function asPgError(err: unknown): { code: string } | null {
  if (typeof err === "object" && err !== null && typeof (err as { code?: unknown }).code === "string") {
    return err as { code: string };
  }
  return null;
}

/**
 * Maps the database integrity errors that a TOCTOU race can still produce (a check passes,
 * then a concurrent write trips the constraint) to a clean 4xx instead of a raw 500 that
 * leaks the Postgres message. Returns true when it handled the error.
 */
function handlePgError(err: unknown, res: Response): boolean {
  const pg = asPgError(err);
  if (!pg) return false;
  switch (pg.code) {
    case "23505": // unique_violation
      res.status(409).json({ status: "error", message: "A record with these details already exists" });
      return true;
    case "23503": // foreign_key_violation
      res.status(400).json({ status: "error", message: "That record is referenced by other data and cannot be changed or removed" });
      return true;
    case "23502": // not_null_violation
    case "23514": // check_violation
      res.status(400).json({ status: "error", message: "One or more values are invalid" });
      return true;
    default:
      return false;
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof ApiError) {
    logger.warn(`ApiError ${err.statusCode}: ${err.message}`);
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
    return;
  }

  // Known DB integrity violations become clean 4xx responses (see handlePgError).
  if (handlePgError(err, res)) {
    logger.warn(`DB constraint error mapped to ${res.statusCode}`, err);
    return;
  }

  logger.error("Unhandled error", err);
  res.status(500).json({
    status: "error",
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
}
