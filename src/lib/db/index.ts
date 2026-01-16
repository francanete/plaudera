import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// HTTP driver - optimal for serverless (single-statement transactions)
// For full transaction support, use the WebSocket driver instead
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

export type Database = typeof db;

// Re-export schema for convenience
export * from "./schema";
