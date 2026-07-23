import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

// Graceful handling: during build/static-gen DATABASE_URL may be absent.
// We create a lazy pool that throws only when actually queried without a URL.
const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function getPool(): Pool {
  if (globalForDb.__arenaNextJsPostgresqlPool) {
    return globalForDb.__arenaNextJsPostgresqlPool;
  }
  if (!databaseUrl) {
    // Return a pool that will fail at query time, not at import time.
    // This lets Next.js build/static-gen succeed without a running DB.
    const p = new Pool({ connectionString: "postgresql://localhost:5432/void" });
    return p;
  }
  const p = new Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = p;
  }
  return p;
}

export const pool = getPool();
export const db = drizzle(pool);
