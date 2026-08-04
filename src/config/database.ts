import { env } from "./env";

export const databaseConfig = {
  url: env.DATABASE_URL,
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? "10", 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT ?? "30000", 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT ?? "5000", 10),
};
