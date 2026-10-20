import { getDb } from "./drizzle";

export const db = getDb();

export type Database = typeof db;

/**
 * The transaction handle passed to `db.transaction(async (tx) => …)`. Derived from
 * Drizzle's own signature so it stays correct across upgrades — use it instead of
 * `tx: any` in repository transaction helpers.
 */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
