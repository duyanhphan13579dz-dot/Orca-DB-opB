import { NextRequest } from "next/server";
import { ok, handleError } from "@/lib/api";
import { FEATURED_SYMBOLS, getHistory } from "@/lib/market";
import { ensureQuarterlyFinancials } from "@/lib/company-service";
import { calculateRSRating } from "@/lib/screener/utils";
import { screenCANSLIM } from "@/lib/screener/canslim";
import { screenMinervini } from "@/lib/screener/minervini";
import { screenWyckoff } from "@/lib/screener/wyckoff";
import { screenElliott } from "@/lib/screener/elliott";

export const dynamic = "force-dynamic";

async function getUniverseData() {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 86400 * 365; // 1 year
  
  const results = await Promise.all(
    FEATURED_SYMBOLS.map(async (symbol) => {
      try {
        const { bars } = await getHistory(symbol, from, to, "D");
        return { symbol, bars };
      } catch {
        return null;
      }
    })
  );
  
  return results.filter((r): r is { symbol: string; bars: any[] } => r !== null);
}

export async function GET(req: NextRequest) {
  const method = req.nextUrl.pathname.split("/").pop(); // canslim, minervini, etc
  
  try {
    const universe = await getUniverseData();
    const rsRatings = calculateRSRating(universe);
    const results: any[] = [];

    for (const item of universe) {
      const rs = rsRatings.get(item.symbol) || 0;
      
      if (method === "canslim") {
        const financials = await ensureQuarterlyFinancials(item.symbol, 5).catch(() => []);
        results.push(screenCANSLIM(item.symbol, item.bars, financials, rs));
      } else if (method === "minervini") {
        results.push(screenMinervini(item.symbol, item.bars, rs));
      } else if (method === "wyckoff") {
        results.push(screenWyckoff(item.symbol, item.bars));
      } else if (method === "elliott") {
        results.push(screenElliott(item.symbol, item.bars));
      }
    }

    const sorted = results.sort((a, b) => b.score - a.score);
    return ok({ method, universeSize: universe.length, results: sorted });
  } catch (err) {
    return handleError(err, "screener");
  }
}
