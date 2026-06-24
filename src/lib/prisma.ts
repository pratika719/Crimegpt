import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Shared PostgreSQL connection pool
// Exported so that pgvector.ts (and any other pg consumers) can reuse a single
// pool instead of each opening their own, which would exhaust the connection
// limit on managed services like Neon / Supabase (typically 20-25 connections).
// ---------------------------------------------------------------------------
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not defined. Please check your .env file."
  );
}

/**
 * Single pg.Pool shared across Prisma (via PrismaPg adapter) and PGVectorStore.
 * Max 10 connections — enough headroom for a single serverless instance while
 * staying well within managed-DB limits when shared.
 */
export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl:
    connectionString.includes("sslmode=require") ||
    connectionString.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : false,
});

// Prevent unhandled pool errors from crashing the process on transient faults.
pool.on("error", (err) => {
  console.warn("⚠️ [prisma] Database pool error:", err.message);
});

// ---------------------------------------------------------------------------
// Prisma client singleton
// ---------------------------------------------------------------------------
const prismaClientSingleton = () => {
  console.log(
    "[prisma.ts] prismaClientSingleton: DATABASE_URL is",
    typeof process.env.DATABASE_URL,
    process.env.DATABASE_URL ? "defined" : "undefined"
  );
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
