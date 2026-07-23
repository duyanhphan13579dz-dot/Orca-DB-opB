import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { SearchBar } from "@/components/search-bar";
import "./globals.css";

const display = Bricolage_Grotesque({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});
const sans = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});
const mono = JetBrains_Mono({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

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
    <html lang="vi" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="antialiased min-h-screen">
        {/* Film-grain overlay — pure CSS noise via SVG data URI, very low opacity. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[1] opacity-[0.035] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          }}
        />
        <header className="sticky top-0 z-40 border-b border-[#1a3558] bg-[#0A2540]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/" className="flex items-center gap-3 shrink-0 group">
              <div className="relative h-8 w-8 rounded-md bg-gradient-to-br from-[#00d4ff] to-[#0073a8] flex items-center justify-center font-black text-[#0A2540] text-sm shadow-[0_0_12px_rgba(0,212,255,0.4)] group-hover:shadow-[0_0_20px_rgba(0,212,255,0.7)] transition-shadow">
                🐋
              </div>
              <div className="leading-tight">
                <div className="font-display font-extrabold tracking-tight text-base text-white">
                  ORCA<span className="text-[#00d4ff]">FINANCIAL</span>
                </div>
                <div className="font-mono text-[9px] tracking-[0.25em] text-[#7aa8d4] uppercase italic">Intelligent Investment</div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-5 text-sm text-slate-400 font-display">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="relative hover:text-[#00d4ff] transition-colors after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-[#00d4ff] after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left">
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
            <div className="font-display">
              © 2026 <span className="text-white font-bold tracking-wide">ORCA FINANCIAL</span> — <span className="italic font-mono text-[#7aa8d4]">Intelligent Investment</span>
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
