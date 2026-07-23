import {
  fetchWithRetry,
  getBreaker,
  ProviderError,
  type NewsItem,
  type Ohlcv,
  type Quote,
  type SymbolInfo,
  type Timeframe,
} from "@/lib/connectors/core";

/* ------------------------------------------------------------------ */
/* VNDirect dchart — PRIMARY (priority 1): history, quotes, indices,  */
/* symbol search. TradingView-compatible UDF payloads.                */
/* ------------------------------------------------------------------ */
const VNDIRECT = "vndirect-dchart";

interface DchartHistory {
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v?: number[];
  s: string;
}

export async function vndirectHistory(
  symbol: string,
  from: number,
  to: number,
  resolution: Timeframe,
): Promise<Ohlcv[]> {
  return getBreaker(VNDIRECT).exec(async () => {
    const url = `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${encodeURIComponent(
      symbol,
    )}&resolution=${resolution}&from=${from}&to=${to}`;
    const res = await fetchWithRetry(url);
    const data = (await res.json()) as DchartHistory;
    if (!Array.isArray(data.t) || data.t.length === 0) {
      throw new ProviderError(VNDIRECT, `no data for ${symbol} (status=${data.s ?? "?"})`);
    }
    return data.t.map((t, i) => ({
      time: t,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v?.[i] ?? 0,
    }));
  });
}

export async function vndirectQuote(symbol: string): Promise<Quote> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 86400 * 14;
  const bars = await vndirectHistory(symbol, from, to, "D");
  const last = bars[bars.length - 1];
  const prev = bars.length > 1 ? bars[bars.length - 2] : null;
  return {
    symbol,
    time: last.time,
    open: last.open,
    high: last.high,
    low: last.low,
    close: last.close,
    volume: last.volume,
    prevClose: prev ? prev.close : null,
    changePct: prev ? ((last.close - prev.close) / prev.close) * 100 : null,
    source: VNDIRECT,
    confidence: 0.95,
  };
}

interface DchartSearchRow {
  symbol: string;
  full_name: string;
  description: string;
  exchange: string;
  type: string;
}

export async function vndirectSearch(query: string): Promise<SymbolInfo[]> {
  return getBreaker(VNDIRECT).exec(async () => {
    const url = `https://dchart-api.vndirect.com.vn/dchart/search?query=${encodeURIComponent(
      query,
    )}&limit=20&type=&exchange=`;
    const res = await fetchWithRetry(url);
    const rows = (await res.json()) as DchartSearchRow[];
    if (!Array.isArray(rows)) throw new ProviderError(VNDIRECT, "unexpected search payload");
    return rows.map((r) => ({
      symbol: r.symbol,
      name: r.description || r.full_name,
      exchange: r.exchange ?? "",
      type: r.type ?? "stock",
      source: VNDIRECT,
    }));
  });
}

/* ------------------------------------------------------------------ */
/* Yahoo Finance — FALLBACK (priority 2) for VN equities (.VN suffix) */
/* ------------------------------------------------------------------ */
const YAHOO = "yahoo-finance";

interface YahooChart {
  chart: {
    result?: Array<{
      timestamp?: number[];
      indicators: { quote: Array<{ open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }> };
    }>;
    error?: { description?: string } | null;
  };
}

export async function yahooHistory(symbol: string, from: number, to: number, resolution: Timeframe): Promise<Ohlcv[]> {
  return getBreaker(YAHOO).exec(async () => {
    const interval = resolution === "D" ? "1d" : resolution === "60" ? "60m" : "15m";
    const ySymbol = /^[A-Z0-9]{3}$/.test(symbol) ? `${symbol}.VN` : symbol;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ySymbol,
    )}?period1=${from}&period2=${to}&interval=${interval}`;
    const res = await fetchWithRetry(url);
    const data = (await res.json()) as YahooChart;
    const result = data.chart.result?.[0];
    if (!result?.timestamp?.length) {
      throw new ProviderError(YAHOO, data.chart.error?.description ?? `no data for ${ySymbol}`);
    }
    const q = result.indicators.quote[0];
    return result.timestamp
      .map((t, i) => ({
        time: t,
        open: q.open[i],
        high: q.high[i],
        low: q.low[i],
        close: q.close[i],
        volume: q.volume[i] ?? 0,
      }))
      .filter((b) => Number.isFinite(b.close));
  });
}

/* ------------------------------------------------------------------ */
/* CoinGecko — crypto prices (real, no key required)                  */
/* ------------------------------------------------------------------ */
const COINGECKO = "coingecko";

export interface CryptoQuote {
  id: string;
  symbol: string;
  priceUsd: number;
  change24hPct: number;
  source: string;
}

export async function coingeckoPrices(): Promise<CryptoQuote[]> {
  return getBreaker(COINGECKO).exec(async () => {
    const ids = "bitcoin,ethereum,binancecoin,solana";
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetchWithRetry(url);
    const data = (await res.json()) as Record<string, { usd: number; usd_24h_change: number }>;
    const symbolMap: Record<string, string> = {
      bitcoin: "BTC",
      ethereum: "ETH",
      binancecoin: "BNB",
      solana: "SOL",
    };
    const out = Object.entries(data).map(([id, v]) => ({
      id,
      symbol: symbolMap[id] ?? id.toUpperCase(),
      priceUsd: v.usd,
      change24hPct: v.usd_24h_change,
      source: COINGECKO,
    }));
    if (out.length === 0) throw new ProviderError(COINGECKO, "empty payload");
    return out;
  });
}

/* ------------------------------------------------------------------ */
/* RSS news connectors — VnExpress, CafeF, Vietstock (real feeds)     */
/* ------------------------------------------------------------------ */
const RSS_SOURCES = [
  { name: "VnExpress", provider: "vnexpress-rss", url: "https://vnexpress.net/rss/kinh-doanh.rss" },
  { name: "CafeF", provider: "cafef-rss", url: "https://cafef.vn/thi-truong-chung-khoan.rss" },
  { name: "Vietstock", provider: "vietstock-rss", url: "https://vietstock.vn/830/chung-khoan/co-phieu.rss" },
] as const;

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? stripCdata(m[1]).trim() : "";
}

function parseRss(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = decodeEntities(tag(block, "title"));
    const link = tag(block, "link");
    if (!title || !link) continue;
    const rawDesc = tag(block, "description");
    const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i) ?? block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    const description = decodeEntities(rawDesc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 500);
    const pubDate = tag(block, "pubDate");
    const publishedAt = pubDate ? new Date(pubDate) : new Date();
    items.push({
      guid: tag(block, "guid") || link,
      title,
      link,
      description,
      imageUrl: imgMatch ? imgMatch[1] : null,
      sourceName,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
    });
  }
  return items;
}

export async function fetchAllRssNews(): Promise<{ items: NewsItem[]; errors: string[] }> {
  const results = await Promise.allSettled(
    RSS_SOURCES.map((src) =>
      getBreaker(src.provider).exec(async () => {
        const res = await fetchWithRetry(src.url, { timeoutMs: 10000 });
        const xml = await res.text();
        const items = parseRss(xml, src.name);
        if (items.length === 0) throw new ProviderError(src.provider, "no items parsed");
        return items;
      }),
    ),
  );
  const items: NewsItem[] = [];
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") items.push(...r.value);
    else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }
  return { items, errors };
}
