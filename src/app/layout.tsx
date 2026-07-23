import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SearchBar } from "@/components/search-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORCA FINANCIAL — Intelligent Investment Platform",
  description:
    "Nền tảng phân tích tài chính AI — dữ liệu thị trường thật (VNDirect, Yahoo, CoinGecko, RSS), phân tích kỹ thuật, fundamental, SWOT và AI Agent.",
};

const NAV = [
  { href: "/", label: "Tổng quan" },
  { href: "/reports", label: "Báo cáo" },
  { href: "/screener", label: "Bộ lọc" },
  { href: "/news", label: "Tin tức" },
  { href: "/watchlist", label: "Theo dõi" },
  { href: "/agent", label: "AI Agent" },
  { href: "/system", label: "Hệ thống" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased min-h-screen">
        <header className="sticky top-0 z-40 border-b border-[#1a3558] bg-[#0A2540]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/" className="flex items-center gap-3 shrink-0 group">
              {/* Orca logo mark */}
              <div className="relative h-8 w-8 rounded-md bg-gradient-to-br from-[#00d4ff] to-[#0073a8] flex items-center justify-center font-black text-[#0A2540] text-sm shadow-[0_0_12px_rgba(0,212,255,0.4)]">
                🐋
              </div>
              <div className="leading-tight">
                <div className="font-black tracking-tight text-base text-white">
                  ORCA<span className="text-[#00d4ff]">FINANCIAL</span>
                </div>
                <div className="text-[9px] tracking-[0.2em] text-[#7aa8d4] uppercase">Intelligent Investment</div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm text-slate-400">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-[#00d4ff] transition-colors">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex-1 flex justify-end">
              <SearchBar />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 py-6 text-xs text-slate-500 border-t border-[#1a3558]/60">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              © 2026 <span className="text-white font-semibold">ORCA FINANCIAL</span> — INTELLIGENT INVESTMENT
            </div>
            <div>
              Dữ liệu thật từ VNDirect dchart, Yahoo Finance, CoinGecko và RSS (VnExpress, CafeF, Vietstock) qua Data Engine với circuit breaker &amp; fallback. Không phải lời khuyên đầu tư.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
