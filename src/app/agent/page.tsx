"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/client";

interface Msg {
  role: "user" | "agent";
  text: string;
  model?: string;
  latencyMs?: number;
}

const SUGGESTIONS = ["Phân tích VNM", "HPG có nên mua không?", "Tổng quan thị trường hôm nay", "So sánh FPT và MWG"];

export default function AgentPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setBusy(true);
    try {
      const env = await api<{ answer: string; model: string }>("/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text: env.data.answer,
          model: env.data.model,
          latencyMs: typeof env.meta?.latencyMs === "number" ? env.meta.latencyMs : undefined,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "agent", text: `⚠️ ${err instanceof Error ? err.message : "Lỗi không xác định"}` },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">AI Agent — Chuyên viên phân tích</h1>
        <p className="text-xs text-slate-500 mt-1">
          Agent truy vấn dữ liệu thật qua Data Engine (giá, chỉ báo kỹ thuật, tin tức) — không bao giờ bịa số liệu.
        </p>
      </div>

      <div className="panel min-h-[420px] p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="text-slate-500 text-sm mb-4">Hỏi về một mã cổ phiếu hoặc thị trường:</div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-600 hover:text-cyan-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-lg bg-cyan-500/15 border border-cyan-800 px-3 py-2 text-sm"
                  : "max-w-[90%] rounded-lg bg-slate-800/60 border border-slate-700 px-3 py-2 text-sm whitespace-pre-wrap"
              }
            >
              {m.text}
              {m.model && (
                <div className="mt-2 text-[10px] text-slate-500">
                  {m.model}{m.latencyMs !== undefined ? ` · ${m.latencyMs}ms` : ""} · dữ liệu real-time từ Data Engine
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="text-sm text-slate-500 animate-pulse">Agent đang truy vấn dữ liệu thật và phân tích…</div>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="VD: Phân tích kỹ thuật HPG…"
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-700"
        />
        <button
          disabled={busy || !input.trim()}
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-cyan-500"
        >
          Gửi
        </button>
      </form>
    </div>
  );
}
