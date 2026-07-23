"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

const METHODS = [
  { id: "canslim", name: "CANSLIM", desc: "Bộ lọc tăng trưởng William O'Neil" },
  { id: "minervini", name: "Trend Template", desc: "Bộ lọc xu hướng Mark Minervini" },
  { id: "wyckoff", name: "Wyckoff", desc: "Xác định pha Tích lũy/Phân phối" },
  { id: "elliott", name: "Elliott Wave", desc: "Đếm sóng đẩy và điều chỉnh" },
];

export default function ScreenerPage() {
  const [method, setMethod] = useState("canslim");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runScreen = async (mId: string) => {
    setLoading(true);
    try {
      const res = await api<any>(`/screener/${mId}`);
      setResults(res.data.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runScreen(method);
  }, [method]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">STOCK SCREENER</h1>
        <div className="flex gap-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`rounded-md border px-4 py-2 text-sm font-bold transition-all ${
                method === m.id
                  ? "border-[#00d4ff] bg-[#00d4ff]/20 text-[#00d4ff]"
                  : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="panel p-4 bg-[#0A2540]">
        <p className="text-sm text-slate-400">
          {METHODS.find((m) => m.id === method)?.desc} • Dữ liệu real-time từ Data Engine
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Đang sàng lọc dữ liệu thị trường thực…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {results.map((r) => (
            <div key={r.symbol} className="panel p-5 border-[#1a3558] hover:border-[#00d4ff]/50 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={`/stocks/${r.symbol}`} className="text-xl font-black text-white hover:text-[#00d4ff]">
                    {r.symbol}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        r.score >= 80 ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {r.classification}
                    </span>
                    <span className="text-xs text-slate-500">Score: {r.score}/100</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#00d4ff] font-bold">MATCH</div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {r.reasons.map((reason: string, i: number) => (
                  <div key={i} className="flex gap-2 text-xs text-slate-300 leading-snug">
                    <span className="text-[#00d4ff]">›</span>
                    {reason}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
