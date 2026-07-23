import { desc } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { jobLogs } from "@/db/schema";
import { checkRateLimit, handleError, ok } from "@/lib/api";
import { allBreakerStatuses } from "@/lib/connectors/core";

export const dynamic = "force-dynamic";

const REGISTRY = [
  { name: "vndirect-dchart", priority: 1, role: "primary", capabilities: ["history", "quotes", "indices", "search"] },
  { name: "yahoo-finance", priority: 2, role: "fallback", capabilities: ["history", "quotes"] },
  { name: "coingecko", priority: 3, role: "crypto", capabilities: ["crypto-prices"] },
  { name: "vnexpress-rss", priority: 4, role: "news", capabilities: ["news", "sentiment"] },
  { name: "cafef-rss", priority: 5, role: "news", capabilities: ["news", "sentiment"] },
  { name: "vietstock-rss", priority: 6, role: "news", capabilities: ["news", "sentiment"] },
  { name: "fundamental-engine", priority: 0, role: "module", capabilities: ["financial-health", "eps", "roe", "dupont", "dcf", "graham", "ddm", "reverse-dcf"] },
  { name: "technical-engine", priority: 0, role: "module", capabilities: ["candlestick-patterns", "chart-patterns", "h&s", "double-top", "cup-handle"] },
  { name: "sentiment-nlp", priority: 0, role: "module", capabilities: ["vietnamese-sentiment", "news-scoring"] },
];

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (limited) return limited;
  try {
    const breakers = allBreakerStatuses();
    const connectors = REGISTRY.map((c) => ({
      ...c,
      circuit: breakers.find((b) => b.name === c.name) ?? { name: c.name, state: "closed", consecutiveFailures: 0, lastError: null, lastSuccessAt: null },
    }));
    const recentJobs = await db.select().from(jobLogs).orderBy(desc(jobLogs.createdAt)).limit(20);
    return ok({ connectors, recentJobs });
  } catch (err) {
    return handleError(err, "admin_connectors");
  }
}
