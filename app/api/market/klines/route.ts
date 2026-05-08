import { NextRequest, NextResponse } from "next/server";
import { fetchBinanceKlines, type MarketMode } from "@/lib/market/binance";

function parseMode(req: NextRequest): MarketMode {
  const mode = (new URL(req.url).searchParams.get("mode") ?? "spot").toLowerCase();
  return mode === "perps" ? "perps" : "spot";
}

// Bybit interval mapping (Bybit uses different interval strings)
function toBybitInterval(interval: string): string {
  const map: Record<string, string> = {
    "1m": "1", "3m": "3", "5m": "5", "15m": "15", "30m": "30",
    "1h": "60", "2h": "120", "4h": "240", "6h": "360", "12h": "720",
    "1d": "D", "1w": "W",
  };
  return map[interval] ?? "1";
}

async function fetchBybitKlines(symbol: string, interval: string, limit: number) {
  const bybitInterval = toBybitInterval(interval);
  const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${encodeURIComponent(symbol)}&interval=${bybitInterval}&limit=${limit}`;
  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
    next: { revalidate: 2 },
  });
  if (!res.ok) throw new Error(`Bybit klines failed (${res.status})`);
  const json = (await res.json()) as { result?: { list?: string[][] }; retCode?: number };
  if (json.retCode !== 0 || !json.result?.list) throw new Error("Bybit returned no data");

  // Bybit returns newest-first, reverse to oldest-first
  return json.result.list.reverse().map((k) => ({
    time: Math.floor(Number(k[0]) / 1000),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
  const interval = (url.searchParams.get("interval") ?? "15m").toLowerCase();
  const limit = Number(url.searchParams.get("limit") ?? "500");
  const safeLimit = Number.isFinite(limit) ? limit : 500;

  if (!symbol) return NextResponse.json({ error: "Missing symbol." }, { status: 400 });

  // Try Binance first, fall back to Bybit
  try {
    const mode = parseMode(req);
    const raw = await fetchBinanceKlines({ mode, symbol, interval, limit: safeLimit });
    const candles = raw.map((k) => ({
      time: Math.floor(k[0] / 1000),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }));
    return NextResponse.json({ mode, symbol, interval, candles }, { status: 200 });
  } catch (binanceErr) {
    console.warn("[klines] Binance failed, trying Bybit:", binanceErr instanceof Error ? binanceErr.message : binanceErr);
  }

  try {
    const candles = await fetchBybitKlines(symbol, interval, safeLimit);
    return NextResponse.json({ source: "bybit", symbol, interval, candles }, { status: 200 });
  } catch (bybitErr) {
    const message = bybitErr instanceof Error ? bybitErr.message : "All data sources failed.";
    console.error("[klines] Bybit also failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
