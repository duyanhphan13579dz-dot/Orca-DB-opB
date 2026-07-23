/**
 * Lightweight in-process scheduler that auto-generates ORCA daily reports.
 *
 * - Morning Brief: 07:30 AM Asia/Ho_Chi_Minh on weekdays
 * - Market Summary: 15:15 PM Asia/Ho_Chi_Minh on weekdays
 *
 * The scheduler is resilient: if a scheduled run is missed (server reboot, etc.),
 * it backfills on the next call by checking DB and generating if missing.
 */

import { generateMarketSummary, generateMorningBrief, getStoredReport } from "./generator";
import { logger } from "@/lib/logger";

let started = false;

function isWeekday(d: Date): boolean {
  const day = d.getUTCDay();
  return day >= 1 && day <= 5;
}

async function ensureReport(type: "morning" | "summary", hourUTC: number, now: Date) {
  // Vietnam is UTC+7 — 7:30 AM VN = 0:30 UTC; 3:15 PM VN = 8:15 UTC.
  const targetHour = hourUTC;
  if (!isWeekday(now)) return;
  if (now.getUTCHours() < targetHour) return;
  const dateKey = now.toISOString().slice(0, 10);
  try {
    const existing = await getStoredReport(type, dateKey);
    if (existing) return;
    logger.info(`auto_generate_report`, { type, date: dateKey });
    if (type === "morning") {
      await generateMorningBrief(now);
    } else {
      await generateMarketSummary(now);
    }
  } catch (err) {
    logger.error(`report_generation_failed`, { type, error: String(err) });
  }
}

export function startReportScheduler() {
  if (started) return;
  started = true;
  logger.info("reports_scheduler_started", { msg: "ORCA reports scheduler started" });

  // Run on startup to backfill today if needed, then every 15 minutes.
  const tick = async () => {
    const now = new Date();
    // Morning brief: 0:30 UTC = 7:30 VN
    await ensureReport("morning", 0, now);
    // Market summary: 8:15 UTC = 15:15 VN
    await ensureReport("summary", 8, now);
  };
  void tick();
  setInterval(tick, 15 * 60 * 1000);
}
