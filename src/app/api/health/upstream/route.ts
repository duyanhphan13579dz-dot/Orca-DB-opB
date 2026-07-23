import { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { allBreakerStatuses } from "@/lib/connectors/core";
import { pingDb } from "@/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/upstream
 *
 * Returns a flat map of every upstream system the app depends on — DB pool,
 * each external connector — with its current status, last measured latency,
 * and error (if any). Intended for external monitoring (Prometheus, Uptime
 * Robot, Grafana) and for the in-app OPS console.
 */
export async function GET(_req: NextRequest) {
  const dbPing = await pingDb();
  const breakers = allBreakerStatuses();

  const upstream: Record<string, { status: "up" | "down" | "degraded"; latencyMs: number | null; error?: string; lastSuccessAt?: string | null }> = {
    database: {
      status: dbPing.ok ? "up" : "down",
      latencyMs: dbPing.latencyMs,
      error: dbPing.error,
    },
  };

  for (const b of breakers) {
    upstream[b.name] = {
      status: b.status === "UP" ? "up" : b.status === "DEGRADED" ? "degraded" : "down",
      latencyMs: b.lastSuccessAt ? Math.max(0, Date.now() - new Date(b.lastSuccessAt).getTime()) : null,
      error: b.lastError ?? undefined,
      lastSuccessAt: b.lastSuccessAt,
    };
  }

  // Synthesise an aggregate status the way the prompt's example expects.
  const anyDown = Object.values(upstream).some((u) => u.status === "down");
  const anyDegraded = Object.values(upstream).some((u) => u.status === "degraded");
  const aggregate = anyDown ? "down" : anyDegraded ? "degraded" : "up";

  return ok({ aggregate, upstream, generatedAt: new Date().toISOString() });
}
