import { sql } from "drizzle-orm";
import { allBreakerStatuses, getStaleFlags } from "@/lib/connectors/core";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let dbOk = false;
  let dbLatencyMs = 0;
  let dbError: string | null = null;
  try {
    const { db } = await import("@/db");
    const t0 = Date.now();
    await db.execute(sql`select 1`);
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const connectors = allBreakerStatuses();
  const down = connectors.filter((c) => c.status === "DOWN").length;
  const degraded = connectors.filter((c) => c.status === "DEGRADED").length;
  const stale = getStaleFlags();

  // Overall health: OK if DB up AND no DOWN connectors (degraded is acceptable).
  const ok = dbOk && down === 0;
  const body = {
    ok,
    status: !dbOk ? "DB_DOWN" : down > 0 ? "DEGRADED_UPSTREAM" : degraded > 0 ? "DEGRADED" : "OK",
    db: { ok: dbOk, latencyMs: dbLatencyMs, error: dbError },
    upstream: {
      total: connectors.length,
      up: connectors.filter((c) => c.status === "UP").length,
      degraded,
      down,
      staleFlags: stale.length,
      connectors: connectors.map((c) => ({
        name: c.name,
        status: c.status,
        state: c.state,
        successRate: c.successRate,
        lastError: c.lastError,
        lastSuccessAt: c.lastSuccessAt,
      })),
    },
    stale,
    latencyMs: Date.now() - started,
  };
  return Response.json(body, { status: ok ? 200 : 503 });
}
