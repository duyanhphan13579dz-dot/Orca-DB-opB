import { isNull } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// Listed companies / instruments, synced from provider symbol search (real data).
export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    name: text("name").notNull(),
    exchange: varchar("exchange", { length: 20 }).notNull().default(""),
    type: varchar("type", { length: 40 }).notNull().default("stock"),
    industry: varchar("industry", { length: 80 }).notNull().default(""),
    sector: varchar("sector", { length: 80 }).notNull().default(""),
    source: varchar("source", { length: 40 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("companies_symbol_uq").on(t.symbol), index("companies_name_idx").on(t.name)],
);

// Company profile (extracted from provider + sector metadata, + synthesized description).
export const companyProfiles = pgTable(
  "company_profiles",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    description: text("description").notNull().default(""),
    industry: varchar("industry", { length: 80 }).notNull().default(""),
    sector: varchar("sector", { length: 80 }).notNull().default(""),
    employees: integer("employees"),
    website: varchar("website", { length: 200 }),
    listingDate: varchar("listing_date", { length: 20 }),
    marketCap: doublePrecision("market_cap"),
    sharesOutstanding: doublePrecision("shares_outstanding"),
    beta: doublePrecision("beta"),
    foreignOwnershipPct: doublePrecision("foreign_ownership_pct"),
    isGenerated: boolean("is_generated").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("company_profiles_symbol_uq").on(t.symbol)],
);

// Company SWOT analysis (rule-based, deterministic; regen on demand).
export const companySwot = pgTable(
  "company_swot",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    strengths: jsonb("strengths").notNull().$type<string[]>(),
    weaknesses: jsonb("weaknesses").notNull().$type<string[]>(),
    opportunities: jsonb("opportunities").notNull().$type<string[]>(),
    threats: jsonb("threats").notNull().$type<string[]>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("company_swot_symbol_uq").on(t.symbol)],
);

// Synthesized quarterly financial statements (income / balance / cashflow).
// Data is derived from real price/volume + sector benchmarks to ensure internal consistency.
export const financialStatements = pgTable(
  "financial_statements",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(), // income | balance | cashflow
    period: varchar("period", { length: 5 }).notNull(), // Q1..Q4, FY
    fiscalYear: integer("fiscal_year").notNull(),
    data: jsonb("data").notNull(),
    source: varchar("source", { length: 40 }).notNull().default("synthetic-sector-model"),
    confidence: doublePrecision("confidence").notNull().default(0.75),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("fs_stmt_uq").on(t.symbol, t.type, t.period, t.fiscalYear),
    index("fs_symbol_idx").on(t.symbol),
    index("fs_year_idx").on(t.fiscalYear),
  ],
);

// News items ingested from real RSS providers (VnExpress, CafeF, Vietstock).
// sentiment column: -1.0 (tiêu cực) .. +1.0 (tích cực), computed by NLP rule engine.
export const news = pgTable(
  "news",
  {
    id: serial("id").primaryKey(),
    guid: text("guid").notNull(),
    title: text("title").notNull(),
    link: text("link").notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    sourceName: varchar("source_name", { length: 60 }).notNull(),
    symbols: text("symbols").notNull().default(""),
    sentiment: doublePrecision("sentiment").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("news_guid_uq").on(t.guid),
    index("news_published_idx").on(t.publishedAt),
    index("news_symbols_idx").on(t.symbols),
  ],
);

// Latest validated price snapshot per symbol (normalized cache of real quotes).
export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    time: timestamp("time", { withTimezone: true }).notNull(),
    open: doublePrecision("open").notNull(),
    high: doublePrecision("high").notNull(),
    low: doublePrecision("low").notNull(),
    close: doublePrecision("close").notNull(),
    volume: doublePrecision("volume").notNull().default(0),
    changePct: doublePrecision("change_pct").notNull().default(0),
    source: varchar("source", { length: 40 }).notNull(),
    confidence: doublePrecision("confidence").notNull().default(0.9),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("price_snapshots_symbol_uq").on(t.symbol), index("price_snapshots_time_idx").on(t.time)],
);

// Anonymous session watchlist.
export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: serial("id").primaryKey(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("watchlist_session_symbol_uq").on(t.sessionId, t.symbol)],
);

// Structured agent audit log.
export const agentLogs = pgTable(
  "agent_logs",
  {
    id: serial("id").primaryKey(),
    sessionId: varchar("session_id", { length: 64 }).notNull().default(""),
    prompt: text("prompt").notNull(),
    response: text("response").notNull(),
    model: varchar("model", { length: 60 }).notNull().default("rule-engine"),
    latencyMs: integer("latency_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("agent_logs_created_idx").on(t.createdAt)],
);

// Background job / sync log.
export const jobLogs = pgTable(
  "job_logs",
  {
    id: serial("id").primaryKey(),
    job: varchar("job", { length: 60 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    detail: text("detail").notNull().default(""),
    durationMs: integer("duration_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("job_logs_created_idx").on(t.createdAt)],
);

// Cached fundamental analysis result per symbol.
export const fundamentalAnalysis = pgTable(
  "fundamental_analysis",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    data: jsonb("data").notNull(),
    source: varchar("source", { length: 40 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("fundamental_analysis_symbol_uq").on(t.symbol)],
);

// Porter value chain per company (auto-generated, sector-keyed, cached).
export const companyValueChains = pgTable(
  "company_value_chains",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    primaryActivities: jsonb("primary_activities").notNull().$type<
      Array<{ name: string; nameVi: string; description: string; icon: string }>
    >(),
    supportActivities: jsonb("support_activities").notNull().$type<
      Array<{ name: string; nameVi: string; description: string; icon: string }>
    >(),
    modelVersion: varchar("model_version", { length: 20 }).notNull().default("porter-v1"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("company_value_chains_symbol_uq").on(t.symbol)],
);

// Operational alerts fired when a connector stays DOWN beyond the alert threshold.
export const connectorAlerts = pgTable(
  "connector_alerts",
  {
    id: serial("id").primaryKey(),
    provider: varchar("provider", { length: 60 }).notNull(),
    level: varchar("level", { length: 20 }).notNull(), // DOWN | DEGRADED | RECOVERED
    message: text("message").notNull(),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    slackOk: boolean("slack_ok"),
  },
  (t) => [
    index("connector_alerts_provider_idx").on(t.provider),
    index("connector_alerts_dispatched_idx").on(t.dispatchedAt),
    index("connector_alerts_open_idx").on(t.provider).where(isNull(t.resolvedAt)),
  ],
);

// Daily research reports (Morning Brief, Market Summary) generated by ORCA.
export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 20 }).notNull(), // morning | summary
    reportDate: varchar("report_date", { length: 10 }).notNull(), // YYYY-MM-DD
    contentHtml: text("content_html").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reports_type_date_uq").on(t.type, t.reportDate), index("reports_date_idx").on(t.reportDate)],
);
