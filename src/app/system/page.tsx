"use client";

import { timeAgo, usePoll } from "@/lib/client";

interface Connector {
  name: string;
  priority: number;
  role: string;
  capabilities: string[];
  circuit: {
    state: "closed" | "open" | "half-open";
    consecutiveFailures: number;
    lastError: string | null;
    lastSuccessAt: string | null;
  };
}
interface JobLog {
  id: number;
  job: string;
  status: string;
  detail: string;
  durationMs: number;
  createdAt: string;
}

const STATE_STYLE: Record<string, string> = {
  closed: "bg-emerald-500/15 text-emerald-300 border-emerald-700",
  "half-open": "bg-amber-500/15 text-amber-300 border-amber-700",
  open: "bg-rose-500/15 text-rose-300 border-rose-700",
};

export default function SystemPage() {
  const { data, error } = usePoll<{ connectors: Connector[]; recentJobs: JobLog[] }>("/admin/connectors", 10000);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">ORCA FINANCIAL — Data Engine Status</h1>
        <p className="text-xs text-slate-500 mt-1">
          Trạng thái circuit breaker của từng connector và nhật ký job (structured logging trong DB).
        </p>
      </div>

      {error && <div className="panel border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-300">{error}</div>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(data?.connectors ?? []).map((c) => (
          <div key={c.name} className="panel p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{c.name}</span>
              <span className={`rounded border px-2 py-0.5 text-[10px] uppercase ${STATE_STYLE[c.circuit.state]}`}>
                {c.circuit.state}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500 space-y-1">
              <div>Priority {c.priority} · {c.role}</div>
              <div>Capabilities: {c.capabilities.join(", ")}</div>
              <div>Lỗi liên tiếp: {c.circuit.consecutiveFailures}</div>
              <div>
                Thành công gần nhất:{" "}
                {c.circuit.lastSuccessAt ? timeAgo(c.circuit.lastSuccessAt) : "chưa gọi trong phiên này"}
              </div>
              {c.circuit.lastError && <div className="text-rose-400 break-all">Lỗi: {c.circuit.lastError.slice(0, 120)}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="panel p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Job logs gần nhất</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="py-1.5">Job</th>
                <th>Status</th>
                <th>Chi tiết</th>
                <th className="text-right">Thời gian</th>
                <th className="text-right">Latency</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentJobs ?? []).map((j) => (
                <tr key={j.id} className="border-b border-slate-800/50">
                  <td className="py-1.5 font-medium">{j.job}</td>
                  <td className={j.status === "ok" ? "text-emerald-400" : "text-rose-400"}>{j.status}</td>
                  <td className="text-slate-500 max-w-md truncate">{j.detail}</td>
                  <td className="text-right text-slate-500">{timeAgo(j.createdAt)}</td>
                  <td className="text-right text-slate-500">{j.durationMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
