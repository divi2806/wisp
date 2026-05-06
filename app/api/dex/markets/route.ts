import { NextResponse } from "next/server";
import { SOLANA_POPULAR_BASES } from "@/lib/market/solanaPopular";
import { SOLANA_TOKEN_DATA } from "@/lib/market/solanaTokenData";
import { fetchTokenTopPool } from "@/lib/market/geckoterminal";

// Stablecoins always ≈ $1 — don't look up a SOL/USDC pool and misread the base price
const STABLE_USD: Record<string, string> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "1.0000", // USDC
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "1.0000", // USDT
};

type DexTicker = {
  symbol: string; name: string; mint: string; poolId: string;
  lastPrice: string; priceChangePercent: string;
  highPrice: string; lowPrice: string; volume: string; quoteVolume: string;
};

/** Fetch one ticker, returning null on any failure. */
async function fetchTicker(symbol: string, mint: string, name: string): Promise<DexTicker | null> {
  // Stablecoins: skip pool lookup
  if (STABLE_USD[mint]) {
    return {
      symbol, name, mint, poolId: "",
      lastPrice: STABLE_USD[mint], priceChangePercent: "0",
      highPrice: "0", lowPrice: "0", volume: "0", quoteVolume: "0",
    };
  }

  try {
    const pool = await fetchTokenTopPool(mint);
    if (!pool) return null;

    // Determine if our mint is the base or quote token in this pool
    const baseId  = pool.relationships?.base_token?.data?.id  ?? "";
    const quoteId = pool.relationships?.quote_token?.data?.id ?? "";
    // GeckoTerminal IDs are "solana_<address>"
    const isBase  = baseId.toLowerCase().includes(mint.toLowerCase());
    const isQuote = quoteId.toLowerCase().includes(mint.toLowerCase());

    let price: string;
    let change: string;
    if (isBase || !isQuote) {
      // Token is the base (or we can't tell) → use base price
      price  = pool.attributes.base_token_price_usd ?? pool.attributes.price_in_usd ?? "0";
      change = pool.attributes.price_change_percentage?.h24 ?? "0";
    } else {
      // Token is the quote (e.g. USDC in SOL/USDC) → use quote price; change is inverted
      price  = pool.attributes.quote_token_price_usd ?? "0";
      const raw = Number(pool.attributes.price_change_percentage?.h24 ?? "0");
      change = Number.isFinite(raw) && raw !== 0 ? String(-raw) : "0";
    }

    return {
      symbol, name, mint,
      poolId: pool.id,
      lastPrice: price || "0",
      priceChangePercent: change || "0",
      highPrice: "0", lowPrice: "0",
      volume: pool.attributes.volume_usd?.h24 ?? "0",
      quoteVolume: pool.attributes.volume_usd?.h24 ?? "0",
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any;
    const now = Date.now();
    const cached = g.__wispDexMarketsCache as { atMs: number; body: unknown } | undefined;
    if (cached && now - cached.atMs < 18_000) {
      return NextResponse.json(cached.body, { status: 200 });
    }

    const entries = SOLANA_POPULAR_BASES
      .map((s) => ({ symbol: s.toUpperCase(), data: SOLANA_TOKEN_DATA[s.toUpperCase()] }))
      .filter((x): x is { symbol: string; data: { address: string; name: string } } => Boolean(x.data?.address));

    // Batch requests in groups of 4 with 250 ms gaps to stay under GeckoTerminal rate limits
    const BATCH = 4;
    const DELAY = 250;
    const results: (DexTicker | null)[] = [];

    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      const partial = await Promise.all(batch.map((e) => fetchTicker(e.symbol, e.data.address, e.data.name)));
      results.push(...partial);
      if (i + BATCH < entries.length) await new Promise((r) => setTimeout(r, DELAY));
    }

    const filtered = results
      .filter((x): x is DexTicker => Boolean(x))
      .sort((a, b) => {
        const ai = SOLANA_POPULAR_BASES.indexOf(a.symbol);
        const bi = SOLANA_POPULAR_BASES.indexOf(b.symbol);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });

    const body = { tickers: filtered };
    g.__wispDexMarketsCache = { atMs: now, body };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load DEX markets." }, { status: 500 });
  }
}
