import http from "http";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@config/env";
import { databaseConfig } from "@config/database";
import { logger } from "@config/logger";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let clientInstance: postgres.Sql | null = null;

export function getPgPool() {
  if (!clientInstance) {
    logger.info("Creating new PostgreSQL connection pool");
    clientInstance = postgres(env.DATABASE_URL, {
      prepare: false,
      max: databaseConfig.maxConnections,
      idle_timeout: databaseConfig.idleTimeoutMillis,
      connect_timeout: databaseConfig.connectionTimeoutMillis,
    });
  }
  return clientInstance;
}

export function getDb() {
  if (!dbInstance) {
    logger.info("Initializing Drizzle database instance");
    dbInstance = drizzle(getPgPool(), { schema });
  }
  return dbInstance;
}

let isShuttingDown = false;

export function setupGracefulShutdown(server: http.Server): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully...`);

    // If a connection is stuck, don't hang forever — force exit after a grace period.
    const forceExit = setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    try {
      // 1. Stop accepting new connections and let in-flight requests drain — BEFORE the
      //    database closes, otherwise those requests lose their connection mid-flight.
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info("HTTP server closed");

      // 2. Then close the database pool.
      if (clientInstance) {
        await clientInstance.end();
        logger.info("Database connections closed");
      }
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown", error as Error);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
