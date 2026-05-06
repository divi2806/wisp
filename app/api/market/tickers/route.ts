import { NextRequest, NextResponse } from "next/server";
import { fetchBinance24hAll, type MarketMode } from "@/lib/market/binance";
import { fetchBinanceExchangeInfo } from "@/lib/market/binance";
import { getSolanaTokenSymbols } from "@/lib/market/solanaTokenSymbols";
import { SOLANA_POPULAR_SET } from "@/lib/market/solanaPopular";

function parseMode(req: NextRequest): MarketMode {
  const mode = (new URL(req.url).searchParams.get("mode") ?? "spot").toLowerCase();
  return mode === "perps" ? "perps" : "spot";
}

export async function GET(req: NextRequest) {
  try {
    const mode = parseMode(req);
    const solanaSymbols = await getSolanaTokenSymbols();
    const quoteAllow = new Set(["USDT", "USDC"]);

    // Determine eligible symbols once from exchangeInfo.
    const info = await fetchBinanceExchangeInfo(mode);
    const allowedSymbols = new Set(
      info.symbols
        .filter((s) => s.status === "TRADING")
        .filter((s) => quoteAllow.has(s.quoteAsset))
        .filter((s) => solanaSymbols.has(s.baseAsset.toUpperCase()))
        .filter((s) => SOLANA_POPULAR_SET.has(s.baseAsset.toUpperCase()))
        .map((s) => s.symbol)
    );

    const tickers = await fetchBinance24hAll(mode);
    const filtered = tickers.filter((t) => allowedSymbols.has(t.symbol));

    return NextResponse.json({ mode, tickers: filtered }, { status: 200 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load tickers." }, { status: 500 });
  }
}

