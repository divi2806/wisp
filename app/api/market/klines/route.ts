import { NextRequest, NextResponse } from "next/server";
import { fetchBinanceKlines, type MarketMode } from "@/lib/market/binance";

function parseMode(req: NextRequest): MarketMode {
  const mode = (new URL(req.url).searchParams.get("mode") ?? "spot").toLowerCase();
  return mode === "perps" ? "perps" : "spot";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
  const interval = (url.searchParams.get("interval") ?? "15m").toLowerCase();
  const limit = Number(url.searchParams.get("limit") ?? "500");

  if (!symbol) return NextResponse.json({ error: "Missing symbol." }, { status: 400 });

  try {
    const mode = parseMode(req);
    const raw = await fetchBinanceKlines({ mode, symbol, interval, limit: Number.isFinite(limit) ? limit : 500 });

    const candles = raw.map((k) => ({
      time: Math.floor(k[0] / 1000),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }));

    return NextResponse.json({ mode, symbol, interval, candles }, { status: 200 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load candles." }, { status: 500 });
  }
}

