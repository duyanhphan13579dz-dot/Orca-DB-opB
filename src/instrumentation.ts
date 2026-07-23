/**
 * Next.js instrumentation hook — runs once per server process on boot.
 * Use this for side-effects that must start before any request is served
 * (background dispatchers, schedulers, warming caches).
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run on the server runtime (not edge).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Lazy imports keep the edge build graph clean.
  try {
    const { startAlertDispatcher } = await import("@/lib/alerts");
    startAlertDispatcher();
  } catch (err) {
    console.error("[instrumentation] alert dispatcher failed to start:", err);
  }

  try {
    const { startReportScheduler } = await import("@/lib/reports/scheduler");
    startReportScheduler();
  } catch (err) {
    console.error("[instrumentation] report scheduler failed to start:", err);
  }
}
