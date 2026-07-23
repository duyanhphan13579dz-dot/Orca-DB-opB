"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/client";

interface Report { type: "morning" | "summary"; date: string; title: string; createdAt: string; }

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ type: string; date: string; html: string } | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/reports")
      .then((r) => r.json())
      .then((j) => setReports(j.data?.reports ?? []))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const generate = async (type: "morning" | "summary", date?: string) => {
    setGenerating(type);
    try {
      const url = `/api/v1/reports/${type}${date ? `?date=${date}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      setViewing({ type, date: json.data?.date ?? date ?? new Date().toISOString().slice(0, 10), html: json.data.html });
      // Refresh list
      const list = await fetch("/api/v1/reports").then((r) => r.json());
      setReports(list.data?.reports ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const morningExists = reports.some((r) => r.type === "morning" && r.date === today);
  const summaryExists = reports.some((r) => r.type === "summary" && r.date === today);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            ORCA <span className="text-[#00d4ff]">Báo cáo hàng ngày</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Morning Brief (đầu phiên) và Market Summary (cuối phiên) — tự động tạo từ dữ liệu thị trường thật bởi ORCA Engine.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generate("morning")}
            disabled={generating === "morning" || morningExists}
            className="btn-orca-outline text-xs disabled:opacity-50"
          >
            {morningExists ? "Morning Brief hôm nay đã có" : generating === "morning" ? "Đang tạo…" : "Tạo Morning Brief hôm nay"}
          </button>
          <button
            onClick={() => generate("summary")}
            disabled={generating === "summary" || summaryExists}
            className="btn-orca text-xs disabled:opacity-50"
          >
            {summaryExists ? "Market Summary hôm nay đã có" : generating === "summary" ? "Đang tạo…" : "Tạo Market Summary hôm nay"}
          </button>
        </div>
      </div>

      {error && <div className="panel border-rose-700 bg-rose-950/20 p-3 text-sm text-rose-300">{error}</div>}

      {/* Viewing pane */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setViewing(null)}>
          <div className="max-w-4xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-2 mb-3 no-print">
              <button
                onClick={() => {
                  const w = window.open("", "_blank");
                  if (!w) return;
                  w.document.write(viewing.html);
                  w.document.close();
                  setTimeout(() => w.print(), 400);
                }}
                className="btn-orca text-xs"
              >
                In / Lưu PDF
              </button>
              <a
                href={`data:text/html;charset=utf-8,${encodeURIComponent(viewing.html)}`}
                download={`ORCA_${viewing.type === "morning" ? "Morning_Brief" : "Market_Summary"}_${viewing.date}.html`}
                className="btn-orca-outline text-xs"
              >
                Tải HTML
              </a>
              <button onClick={() => setViewing(null)} className="btn-orca-outline text-xs ml-auto">Đóng</button>
            </div>
            <div className="bg-white rounded shadow-2xl overflow-hidden">
              <div className="report-page" dangerouslySetInnerHTML={{ __html: viewing.html }} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {["morning", "summary"].map((type) => {
          const label = type === "morning" ? "Morning Brief" : "Market Summary";
          const desc = type === "morning"
            ? "Báo cáo đầu ngày 7:30 — tổng thế giới, phân tích VN-Index, sự kiện, khuyến nghị."
            : "Nhận định cuối phiên 15:15 — diễn biến, top movers, khối ngoại, dự báo phiên tới.";
          const typeReports = reports.filter((r) => r.type === type);
          return (
            <div key={type} className="panel p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-white">{label}</h2>
                <button onClick={() => generate(type as "morning" | "summary")} className="text-xs text-[#00d4ff] hover:underline">
                  Tạo mới
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-4">{desc}</p>
              <div className="space-y-1.5">
                {typeReports.length === 0 && <div className="text-xs text-slate-500 italic">Chưa có báo cáo nào. Nhấn "Tạo mới".</div>}
                {typeReports.map((r) => (
                  <div key={r.date} className="flex items-center justify-between rounded border border-slate-700/60 bg-slate-800/30 px-3 py-2 text-sm hover:border-[#00d4ff]/50">
                    <div>
                      <div className="font-medium text-white">{r.title}</div>
                      <div className="text-[11px] text-slate-500">Tạo {timeAgo(r.createdAt)}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/v1/reports/${type}?date=${r.date}`);
                          const j = await res.json();
                          setViewing({ type, date: r.date, html: j.data.html });
                        }}
                        className="rounded border border-[#0073a8] text-[#00d4ff] px-2 py-1 text-[11px] hover:bg-[#00d4ff]/10"
                      >
                        Xem / PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel p-4 text-xs text-slate-400">
        <strong className="text-white">Hướng dẫn:</strong> Nhấn "Xem / PDF" rồi dùng nút <strong className="text-[#00d4ff]">In / Lưu PDF</strong> để tải PDF (chức năng Print-to-PDF của trình duyệt).
        Báo cáo được tạo tự động lúc 7:30 (Morning) và 15:15 (Market Summary) giờ Việt Nam vào các ngày giao dịch.
      </div>
    </div>
  );
}
