import { NextRequest, NextResponse } from "next/server";
import { fetchPoolOHLCV } from "@/lib/market/geckoterminal";

function intervalToGecko(interval: string): { timeframe: "minute" | "hour" | "day"; aggregate: number } {
  switch (interval) {
    case "1m":
      return { timeframe: "minute", aggregate: 1 };
    case "5m":
      return { timeframe: "minute", aggregate: 5 };
    case "15m":
      return { timeframe: "minute", aggregate: 15 };
    case "1h":
      return { timeframe: "hour", aggregate: 1 };
    case "4h":
      return { timeframe: "hour", aggregate: 4 };
    case "1d":
      return { timeframe: "day", aggregate: 1 };
    default:
      return { timeframe: "minute", aggregate: 15 };
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const poolId = url.searchParams.get("poolId") ?? "";
  const interval = (url.searchParams.get("interval") ?? "15m").toLowerCase();
  const limit = Number(url.searchParams.get("limit") ?? "300");

  if (!poolId) return NextResponse.json({ error: "Missing poolId." }, { status: 400 });

  try {
    // In-memory cache (per process) to avoid rate limits.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any;
    const cacheKey = `ohlcv:${poolId}:${interval}`;
    const now = Date.now();
    const cached = (g.__wispDexOhlcvCache as Map<string, { atMs: number; body: unknown }> | undefined) ?? new Map();
    g.__wispDexOhlcvCache = cached;
    const hit = cached.get(cacheKey);
    if (hit && now - hit.atMs < 20_000) {
      return NextResponse.json(hit.body, { status: 200 });
    }

    const { timeframe, aggregate } = intervalToGecko(interval);
    try {
      const raw = await fetchPoolOHLCV({
        poolId,
        timeframe,
        aggregate,
        limit: Number.isFinite(limit) ? limit : 300,
      });

      const candles = raw
        .map((c) => ({
          time: c[0],
          open: c[1],
          high: c[2],
          low: c[3],
          close: c[4],
          volume: c[5],
        }))
        .reverse(); // Gecko returns newest-first

      const body = { poolId, interval, candles, stale: false };
      cached.set(cacheKey, { atMs: now, body });
      return NextResponse.json(body, { status: 200 });
    } catch (err: unknown) {
      // GeckoTerminal rate-limits frequently (429). Prefer showing stale cached candles over breaking the UI.
      const msg = err instanceof Error ? err.message : String(err);
      if (hit) {
        const body =
          typeof hit.body === "object" && hit.body !== null
            ? { ...(hit.body as Record<string, unknown>), stale: true, warning: "rate_limited" }
            : { poolId, interval, candles: [], stale: true, warning: "rate_limited" };
        return NextResponse.json(body, {
          status: 200,
          headers: { "x-wisp-stale": "1", "x-wisp-warning": msg.includes("429") ? "rate_limited" : "upstream_error" },
        });
      }
      // No cache to fall back to: surface as 429 so client can backoff.
      if (msg.includes("429")) {
        return NextResponse.json({ error: "Rate limited by data provider.", stale: false }, { status: 429 });
      }
      throw err;
    }
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load OHLCV." }, { status: 500 });
  }
}

