// Load .env BEFORE any module that reads process.env at import time (notably
// @config/env, which validates it). ES imports are hoisted, so this must be the very
// first import — a later `dotenv.config()` call runs too late.
import "dotenv/config";
import http from "http";
import app from "./app";
import { env } from "@config/env";
import { logger } from "@config/logger";
import { setupGracefulShutdown } from "@db/drizzle";
import { migrateMachinesTable } from "@db/migrate-machines";
import { migrateRemainingWeightColumns } from "@db/migrate-remaining-weight";
import { migrateReconciliationColumns } from "@db/migrate-reconciliation-columns";
import { migrateSpeedColumn } from "@db/migrate-speed-column";

const server = http.createServer(app);

// Run non-blocking schema migrations
migrateMachinesTable();
migrateRemainingWeightColumns();
migrateReconciliationColumns();
migrateSpeedColumn();

server.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

// Last-resort safety nets: a rejected promise or thrown error outside a request handler
// should be logged instead of vanishing silently or killing the process without a trace.
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", reason as Error);
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
});

setupGracefulShutdown(server);
