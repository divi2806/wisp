import { NextRequest, NextResponse } from "next/server";
import { fetchBinanceExchangeInfo, type BinanceMarket, type MarketMode } from "@/lib/market/binance";
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
    const info = await fetchBinanceExchangeInfo(mode);

    const quoteAllow = new Set(["USDT", "USDC"]);

    const markets: BinanceMarket[] = info.symbols
      .filter((s) => s.status === "TRADING")
      .filter((s) => quoteAllow.has(s.quoteAsset))
      .filter((s) => solanaSymbols.has(s.baseAsset.toUpperCase()))
      .filter((s) => SOLANA_POPULAR_SET.has(s.baseAsset.toUpperCase()))
      .map((s) => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        pricePrecision: s.pricePrecision,
        quantityPrecision: s.quantityPrecision,
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    return NextResponse.json({ mode, markets }, { status: 200 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load markets." }, { status: 500 });
  }
}

