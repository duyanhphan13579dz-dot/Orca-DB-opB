import { logger } from "@/lib/logger";

/** Shared connector domain types */
export type Timeframe = "1" | "15" | "60" | "D";

export interface Ohlcv {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  prevClose: number | null;
  changePct: number | null;
  source: string;
  confidence: number;
}

export interface SymbolInfo {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  source: string;
}

export interface NewsItem {
  guid: string;
  title: string;
  link: string;
  description: string;
  imageUrl: string | null;
  sourceName: string;
  publishedAt: Date;
}

export class ProviderError extends Error {
  constructor(
    public provider: string,
    message: string,
  ) {
    super(`[${provider}] ${message}`);
  }
}

/**
 * Circuit breaker: after `failureThreshold` consecutive failures the circuit
 * opens for `cooldownMs`; calls fail fast so the fallback provider takes over.
 */
export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private lastError: string | null = null;
  private lastSuccessAt = 0;

  constructor(
    public readonly name: string,
    private failureThreshold = 4,
    private cooldownMs = 90_000,
  ) {}

  get state(): "closed" | "open" | "half-open" {
    if (this.openedAt === 0) return "closed";
    if (Date.now() - this.openedAt > this.cooldownMs) return "half-open";
    return "open";
  }

  status() {
    return {
      name: this.name,
      state: this.state,
      consecutiveFailures: this.failures,
      lastError: this.lastError,
      lastSuccessAt: this.lastSuccessAt ? new Date(this.lastSuccessAt).toISOString() : null,
    };
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      throw new ProviderError(this.name, "circuit open (cooling down)");
    }
    try {
      const result = await fn();
      this.failures = 0;
      this.openedAt = 0;
      this.lastSuccessAt = Date.now();
      return result;
    } catch (err) {
      this.failures += 1;
      this.lastError = err instanceof Error ? err.message : String(err);
      if (this.failures >= this.failureThreshold) {
        this.openedAt = Date.now();
        logger.warn("circuit_opened", { provider: this.name, failures: this.failures, error: this.lastError });
      }
      throw err;
    }
  }
}

const breakers = new Map<string, CircuitBreaker>();
export function getBreaker(name: string): CircuitBreaker {
  let b = breakers.get(name);
  if (!b) {
    b = new CircuitBreaker(name);
    breakers.set(name, b);
  }
  return b;
}
export function allBreakerStatuses() {
  return [...breakers.values()].map((b) => b.status());
}

/** fetch with timeout + retry with backoff. Never fabricates data: throws on failure. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit & { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const { timeoutMs = 8000, retries = 2, ...rest } = init;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...rest,
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "application/json, text/xml, application/xml, */*",
          ...(rest.headers ?? {}),
        },
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Simple in-memory TTL cache to keep API latency low without faking data. */
const cache = new Map<string, { value: unknown; expiresAt: number }>();
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await loader();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

/** In-memory rate limiter (per key, sliding window). */
const rateBuckets = new Map<string, number[]>();
export function rateLimit(key: string, limit = 120, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (rateBuckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    rateBuckets.set(key, arr);
    return false;
  }
  arr.push(now);
  rateBuckets.set(key, arr);
  return true;
}
