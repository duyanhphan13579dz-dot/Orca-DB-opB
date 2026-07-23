# VNStock Terminal — Nền tảng tài chính AI cho thị trường Việt Nam

Fullstack Next.js (App Router) + PostgreSQL (Drizzle ORM). **Mọi dữ liệu đều là dữ liệu thật** từ nguồn ngoài — không mock, không fabricate.

## Nguyên tắc

1. **No mock data** — giá, chỉ số, tin tức, crypto đều fetch live từ provider thật.
2. **No fake API** — provider lỗi → fallback chain; tất cả lỗi → API trả 502/503, không bịa số liệu.
3. **No placeholder UI** — mọi component nối trực tiếp với API backend.
4. **Connector wrapping** — retry + backoff + timeout + `CircuitBreaker` (4 fail → open 90s → fallback).
5. **Frontend không bao giờ gọi nguồn ngoài** — chỉ qua `/api/v1/*`.
6. **Structured logging** — JSON logs + `job_logs`/`agent_logs` trong DB.
7. **Rate limit** — sliding window per-IP trên mọi endpoint.

## Modules

### 1. Data Engine (Core)
- **Providers:** VNDirect dchart (primary), Yahoo Finance (fallback), CoinGecko (crypto), VnExpress/CafeF/Vietstock RSS (news).
- **Circuit breaker:** mỗi provider có breaker riêng, state closed/half-open/open, observable qua `/admin/connectors`.
- **TTL cache:** in-memory, tuỳ endpoint (10s quotes, 60s daily history, 90s news sync).
- **Validation/confidence:** mỗi quote/bar kèm `{source, confidence}` metadata.

### 2. Financial Health Engine
- **6 nhóm chỉ số** (tổng trọng số = 1): Liquidity (0.10), Leverage (0.20), Profitability (0.25), Efficiency (0.15), Growth (0.15), Cashflow (0.15).
- **Các chỉ số mới:** D/E, EBITDA/Tổng tài sản, EBITDA/Lãi vay, FCF/EBIT.
- **Rating:** A (≥80) → B (≥60) → C (≥40) → D (≥20) → E.
- Mỗi nhóm có điểm 0–100 và giải thích chi tiết.

### 3. Fundamental Analyst
- **Báo cáo 4 quý:** avgPrice, returnPct, volatility, Sharpe proxy.
- **Chỉ số:** EPS, ROE, ROA, ROS, CAGR 3 năm.
- **DuPont Decomposition:** ROE = NetMargin × AssetTurnover × EquityMultiplier.
- **Định giá 8 mô hình:**
  - P/E, P/B, EV/EBITDA, P/CF
  - **DDM** (Dividend Discount Model)
  - **DCF 3 kịch bản** (bi quan, cơ sở, lạc quan) với WACC 10%
  - **Graham Number** = √(22.5 × EPS × BVPS)
  - **Reverse DCF** — tìm implied growth rate từ giá hiện tại
- **Intrinsic value range:** tổng hợp tất cả mô hình → vùng giá trị nội tại.
- **Verdict:** Định giá thấp / Hợp lý / Định giá cao.

### 4. Sentiment Score (Vietnamese NLP)
- **Rule-based NLP** với ~120 từ/cụm từ tiếng Việt tài chính (tăng mạnh, bán tháo, lãi lớn…).
- **Intensity weights** (0.05–0.40) cho mỗi từ.
- **Context-aware:** phát hiện phủ định (không, chưa, chẳng), cường điệu (rất, cực), giảm nhẹ (hơi, nhẹ).
- **Multi-word priority:** cụm dài match trước (ví dụ "tăng mạnh" > "tăng").
- Scoring: -1.0 (rất tiêu cực) … 0.0 (trung lập) … +1.0 (rất tích cực).
- Chạy tự động trên mọi tin RSS khi ingest → lưu vào DB.
- API: sentiment trung bình 24h per symbol + sentiment thị trường chung.

### 5. Technical Analyst — Pattern Detection

#### Mô hình nến Nhật (14 patterns):
| Pattern | Tiếng Việt | Loại | Reliability |
|---------|-----------|------|-------------|
| Doji | Doji | Neutral | 50% |
| Dragonfly Doji | Doji Chuồn Chuồn | Bullish | 60% |
| Gravestone Doji | Doji Bia Mộ | Bearish | 60% |
| Hammer | Nến Búa | Bullish | 65% |
| Inverted Hammer | Búa Ngược | Bullish | 55% |
| Shooting Star | Sao Băng | Bearish | 65% |
| Hanging Man | Người Treo Cổ | Bearish | 60% |
| Bullish Engulfing | Nhấn Chìm Tăng | Bullish | 75% |
| Bearish Engulfing | Nhấn Chìm Giảm | Bearish | 75% |
| Bullish/Bearish Harami | Harami | ±55% | 55% |
| Morning Star | Sao Mai | Bullish | 80% |
| Evening Star | Sao Hôm | Bearish | 80% |
| Three White Soldiers | Ba Chàng Lính | Bullish | 75% |
| Three Black Crows | Ba Con Quạ | Bearish | 75% |
| Spinning Top | Con Quay | Neutral | 40% |
| Marubozu | Marubozu | ± | 70% |

#### Mẫu hình giá (7 patterns):
| Pattern | Tiếng Việt | Loại | Reliability |
|---------|-----------|------|-------------|
| Double Top | Hai Đỉnh | Bearish | 70% |
| Double Bottom | Hai Đáy | Bullish | 70% |
| Head and Shoulders | Vai Đầu Vai | Bearish | 80% |
| Inverse H&S | Vai Đầu Vai Ngược | Bullish | 80% |
| Ascending Triangle | Tam Giác Tăng | Bullish | 65% |
| Descending Triangle | Tam Giác Giảm | Bearish | 65% |
| Cup and Handle | Cốc Tay Cầm | Bullish | 70% |

Mỗi pattern có `target price` tính từ pattern height / neckline.

## API Contract (`/api/v1`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/search?q=&type=` | Autocomplete (DB + VNDirect) |
| GET | `/stocks/:symbol` | Quote + company profile |
| GET | `/stocks/:symbol/history?timeframe=` | OHLCV bars |
| GET | `/stocks/:symbol/analysis` | Technical analysis + khuyến nghị |
| GET | `/stocks/:symbol/fundamental` | **Báo cáo cơ bản 4 quý, EPS, ROE, DuPont, DCF 3 kịch bản, Graham, DDM, Reverse DCF** |
| GET | `/stocks/:symbol/technical?timeframe=` | **Mẫu hình nến + mẫu hình giá** |
| GET | `/stocks/:symbol/sentiment` | **Sentiment NLP 24h (symbol + market)** |
| GET | `/market/overview` | Chỉ số, breadth, movers, crypto |
| GET | `/news?page=&limit=&symbol=` | Tin RSS thật + sentiment scores |
| POST | `/agent/chat` | AI Agent (tích hợp tất cả 5 modules) |
| GET/POST/DELETE | `/watchlist` | Session watchlist |
| GET | `/admin/connectors` | Circuit breaker + job logs |

## Pages

| Route | Mô tả |
|-------|-------|
| `/` | Dashboard: ticker tape, chỉ số, breadth, bảng giá, tin |
| `/stocks/[symbol]` | 5 tabs: Tổng quan (chart+health+patterns+sentiment), Phân tích KT, Cơ bản (DuPont+DCF+Graham), Mẫu hình, Tin tức |
| `/news` | Tin với sentiment scores |
| `/watchlist` | Danh sách theo dõi |
| `/agent` | Chat AI (tự động kết hợp tất cả modules) |
| `/system` | Circuit breaker status + job logs |

## License

MIT
