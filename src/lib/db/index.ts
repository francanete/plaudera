import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

// WebSocket driver - supports full transactions and connection pooling
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

export type Database = typeof db;

// Re-export schema for convenience
export * from "./schema";
