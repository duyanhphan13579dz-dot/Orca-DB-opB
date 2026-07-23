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

/**
 * Lightweight liveness probe — runs `SELECT 1` against the pool with a 3s
 * timeout. Used by `/api/health` and `/api/health/upstream`. If the pool has
 * been idle and the server closed the connection, `pg` will transparently
 * reconnect on the next acquire; if the DB host is unreachable this rejects.
 */
export async function pingDb(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("pool_connect_timeout")), 3000)),
    ]);
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
    }
    return { ok: true, latencyMs: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
