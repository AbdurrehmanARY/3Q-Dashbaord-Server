import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env, isProduction } from "@config/env";
import { logger } from "@config/logger";
import { errorHandler, notFound } from "@api/utils";
import { apiRateLimiter } from "@api/middleware/rateLimiter";
import apiRouter from "@api/routes";

export const app = express();

// Support a comma-separated allow-list; keep "*" only as an explicit escape hatch. A
// wildcard in production is almost never intended (and can't be combined with credentials),
// so surface it loudly instead of shipping it silently.
const corsOrigin = env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(",").map((o) => o.trim());
if (isProduction && corsOrigin === "*") {
  logger.warn("CORS_ORIGIN is '*' in production — set an explicit comma-separated allow-list of origins.");
}

app.use(helmet());
app.use(compression());
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Lightweight request logging (method, path, status, elapsed) via the existing logger —
// no extra dependency, and it gives production a per-request trail.
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", apiRateLimiter, apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
