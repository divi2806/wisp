import { NextRequest, NextResponse } from "next/server";
import { fetchBinance24h, type MarketMode } from "@/lib/market/binance";

function parseMode(req: NextRequest): MarketMode {
  const mode = (new URL(req.url).searchParams.get("mode") ?? "spot").toLowerCase();
  return mode === "perps" ? "perps" : "spot";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
  if (!symbol) return NextResponse.json({ error: "Missing symbol." }, { status: 400 });

  try {
    const mode = parseMode(req);
    const data = await fetchBinance24h(mode, symbol);
    return NextResponse.json({ mode, ...data }, { status: 200 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load ticker." }, { status: 500 });
  }
}

