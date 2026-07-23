"use client";

import Link from "next/link";
import { changeColor, fmtNum, fmtPct, fmtVol, timeAgo, usePoll } from "@/lib/client";

interface Quote {
  symbol: string;
  time: number;
  close: number;
  volume: number;
  changePct: number | null;
  source: string;
  confidence: number;
}
interface IndexQuote extends Quote {
  code: string;
  name: string;
  exchange: string;
}
interface Crypto {
  symbol: string;
  priceUsd: number;
  change24hPct: number;
}
interface Overview {
  indices: IndexQuote[];
  breadth: { advancers: number; decliners: number; unchanged: number; sample: number };
  topGainers: Quote[];
  topLosers: Quote[];
  quotes: Quote[];
  crypto: Crypto[];
  generatedAt: string;
}
interface NewsItem {
  id: number;
  title: string;
  link: string;
  sourceName: string;
  symbols: string;
  publishedAt: string;
  imageUrl: string | null;
}

export default function DashboardPage() {
  const { data: overview, error, loading } = usePoll<Overview>("/market/overview", 15000);
  const { data: newsData } = usePoll<{ items: NewsItem[] }>("/news?limit=8", 60000);

  return (
    <div className="space-y-6">
      {/* Ticker tape */}
      {overview && overview.quotes.length > 0 && (
        <div className="panel overflow-hidden py-2">
          <div className="ticker-tape flex w-max gap-8 whitespace-nowrap text-sm">
            {[...overview.quotes, ...overview.quotes].map((q, i) => (
              <Link key={`${q.symbol}-${i}`} href={`/stocks/${q.symbol}`} className="flex items-center gap-2">
                <span className="font-semibold">{q.symbol}</span>
                <span className="text-slate-300">{fmtNum(q.close)}</span>
                <span className={changeColor(q.changePct)}>{fmtPct(q.changePct)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="panel border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-300">
          Không lấy được dữ liệu từ providers: {error}. Hệ thống sẽ tự thử lại (fallback chain đang hoạt động).
        </div>
      )}
      {loading && !overview && (
        <div className="panel p-8 text-center text-slate-500 text-sm">Đang tải dữ liệu thật từ Data Engine…</div>
      )}

      {/* Indices */}
      {overview && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {overview.indices.map((idx) => (
              <div key={idx.code} className="panel p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{idx.name}</span>
                  <span className="text-[10px] text-slate-600 uppercase">{idx.source}</span>
                </div>
                <div className="mt-1 flex items-end gap-3">
                  <span className="text-2xl font-bold">{fmtNum(idx.close)}</span>
                  <span className={`text-sm font-semibold ${changeColor(idx.changePct)}`}>{fmtPct(idx.changePct)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">KLGD: {fmtVol(idx.volume)}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Breadth + crypto */}
            <div className="space-y-4">
              <div className="panel p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Độ rộng thị trường (top {overview.breadth.sample} mã)</h3>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
                  <div className="bg-emerald-500" style={{ width: `${(overview.breadth.advancers / overview.breadth.sample) * 100}%` }} />
                  <div className="bg-amber-500" style={{ width: `${(overview.breadth.unchanged / overview.breadth.sample) * 100}%` }} />
                  <div className="bg-rose-500" style={{ width: `${(overview.breadth.decliners / overview.breadth.sample) * 100}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span className="text-emerald-400">▲ {overview.breadth.advancers} tăng</span>
                  <span className="text-amber-400">■ {overview.breadth.unchanged} đứng</span>
                  <span className="text-rose-400">▼ {overview.breadth.decliners} giảm</span>
                </div>
              </div>
              <div className="panel p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Crypto (CoinGecko)</h3>
                <div className="space-y-1.5">
                  {overview.crypto.map((c) => (
                    <div key={c.symbol} className="flex justify-between text-sm">
                      <span className="font-medium">{c.symbol}</span>
                      <span className="text-slate-300">${c.priceUsd.toLocaleString()}</span>
                      <span className={changeColor(c.change24hPct)}>{fmtPct(c.change24hPct)}</span>
                    </div>
                  ))}
                  {overview.crypto.length === 0 && <div className="text-xs text-slate-500">Provider tạm thời không khả dụng</div>}
                </div>
              </div>
            </div>

            {/* Movers */}
            <div className="panel p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Bảng giá — cổ phiếu vốn hóa lớn (real-time qua API)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                      <th className="py-1.5">Mã</th>
                      <th className="text-right">Giá</th>
                      <th className="text-right">+/- %</th>
                      <th className="text-right">KL</th>
                      <th className="text-right">Nguồn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.quotes.map((q) => (
                      <tr key={q.symbol} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-1.5">
                          <Link href={`/stocks/${q.symbol}`} className="font-semibold text-cyan-400 hover:underline">
                            {q.symbol}
                          </Link>
                        </td>
                        <td className="text-right">{fmtNum(q.close)}</td>
                        <td className={`text-right font-medium ${changeColor(q.changePct)}`}>{fmtPct(q.changePct)}</td>
                        <td className="text-right text-slate-400">{fmtVol(q.volume)}</td>
                        <td className="text-right text-[10px] text-slate-600">{q.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* News */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">Tin tức thị trường (RSS thật: VnExpress · CafeF · Vietstock)</h3>
          <Link href="/news" className="text-xs text-cyan-400 hover:underline">Xem tất cả →</Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(newsData?.items ?? []).map((n) => (
            <a key={n.id} href={n.link} target="_blank" rel="noreferrer" className="flex gap-3 rounded-md p-2 hover:bg-slate-800/40">
              {n.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.imageUrl} alt="" className="h-14 w-20 rounded object-cover shrink-0" />
              )}
              <div>
                <div className="text-sm leading-snug line-clamp-2">{n.title}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {n.sourceName} · {timeAgo(n.publishedAt)}
                  {n.symbols && <span className="ml-2 text-cyan-500">{n.symbols}</span>}
                </div>
              </div>
            </a>
          ))}
          {!newsData && <div className="text-sm text-slate-500">Đang tải tin…</div>}
        </div>
      </div>
    </div>
  );
}
