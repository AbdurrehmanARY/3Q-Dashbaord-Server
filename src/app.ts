import express, { Router } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env, isProduction } from "@config/env";
import { logger } from "@config/logger";
import { errorHandler, notFound } from "@shared/errors";
import { apiRateLimiter } from "@shared/middleware/rateLimiter";
// --- module routers (one vertical slice per domain) ------------------------
import healthRoutes from "@modules/health/health.routes";
import companiesRoutes from "@modules/companies/company.routes";
import brandsRoutes from "@modules/brands/brand.routes";
import materialsRoutes from "@modules/inventory/material.routes";
import {
  stickerMaterialsRouter,
  localSheetsRouter,
  labelSheetsRouter,
} from "@modules/material-receipts/material-receipts.routes";
import machinesRoutes from "@modules/machines/machine.routes";
import operatorsRoutes from "@modules/operators/operator.routes";
import usersRoutes from "@modules/users/users.routes";
import workOrdersRoutes from "@modules/work-orders/work-orders.routes";
import productionOrdersRoutes from "@modules/production/production-orders/production-order.routes";
import wovenProductionRoutes from "@modules/production/woven-production/woven-production.routes";
import batchFlowRoutes from "@modules/production/batch-and-runs/batch-flow.routes";
import inventoryRoutes from "@modules/inventory/inventory.routes";
import threadInventoryRoutes from "@modules/thread/thread-inventory/thread-inventory.routes";
import threadServiceProviderRoutes from "@modules/thread/thread-service-provider/thread-service-provider.routes";
import threadDyeingRoutes from "@modules/thread/thread-dyeing/thread-dyeing.routes";
import inkRoutes from "@modules/ink/ink.routes";
import analyticsRoutes from "@modules/analytics/analytics.routes";
import labelTypesRoutes from "@modules/label-types/label-types.routes";

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

/**
 * API router, assembled from the module slices. Mount order is significant and
 * must not be reordered.
 */
const apiRouter = Router();

// API root probe. Nested in its own router (matching the pre-refactor composition,
// where index.routes.ts was mounted at "/") so the resulting route table is
// byte-identical. Declared inside apiRouter so it stays behind apiRateLimiter.
const indexRouter = Router();
indexRouter.get("/", (req, res) => {
  res.json({ message: "API is running" });
});
apiRouter.use("/", indexRouter);

apiRouter.use("/health", healthRoutes);
apiRouter.use("/companies", companiesRoutes);
apiRouter.use("/brands", brandsRoutes);
/* Specific /materials/* receipt ledgers mount BEFORE /materials so they aren't swallowed
   by the materials router's own /:code route. */
apiRouter.use("/materials/stickers", stickerMaterialsRouter);
apiRouter.use("/materials/local-sheets", localSheetsRouter);
apiRouter.use("/materials/label-sheets", labelSheetsRouter);
apiRouter.use("/materials", materialsRoutes);
apiRouter.use("/machines", machinesRoutes);
apiRouter.use("/operators", operatorsRoutes);
apiRouter.use("/users", usersRoutes);
apiRouter.use("/work-orders", workOrdersRoutes);
apiRouter.use("/production-orders", productionOrdersRoutes);
/** Woven workflow — same production_orders header, woven-specific stages. */
apiRouter.use("/woven-production", wovenProductionRoutes);
/** Batch-based production: Printing / Cutting / Packaging batch CRUD and the roll flow. */
apiRouter.use("/production", batchFlowRoutes);
apiRouter.use("/inventory", inventoryRoutes);
/** Thread stock, receiving and dyeing — the woven side of inventory. */
apiRouter.use("/thread", threadInventoryRoutes);
/** External dyeing service providers (master data for the dyeing send/receive workflow). */
apiRouter.use("/thread-service-providers", threadServiceProviderRoutes);
/** Thread dyeing send/receive workflow — deducts undyed stock, credits dyed stock per colour. */
apiRouter.use("/thread-dyeing", threadDyeingRoutes);
/** Ink purchasing, derived stock and consumption. */
apiRouter.use("/ink", inkRoutes);
/** Label Types master data */
apiRouter.use("/label-types", labelTypesRoutes);
apiRouter.use("/analytics", analyticsRoutes);

app.use("/api", apiRateLimiter, apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
