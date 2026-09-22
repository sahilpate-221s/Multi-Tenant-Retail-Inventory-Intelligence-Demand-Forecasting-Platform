import  { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Check your .env file.");
}

const poolMax = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10;
const idleTimeout = process.env.DB_IDLE_TIMEOUT ? parseInt(process.env.DB_IDLE_TIMEOUT, 10) : 20;
const connectTimeout = process.env.DB_CONNECT_TIMEOUT ? parseInt(process.env.DB_CONNECT_TIMEOUT, 10) : 10;

// Configurable client pool tuning:
// - max: controls max concurrent connections per backend instance (default 10)
// - idle_timeout: reclaims idle connections after N seconds
// - prepare: false ensures compatibility with pgBouncer / Supavisor transaction poolers
const queryClient = postgres(connectionString, {
  max: poolMax,
  idle_timeout: idleTimeout,
  connect_timeout: connectTimeout,
  prepare: process.env.DB_PREPARE === "true",
});

export const db = drizzle(queryClient, { schema });