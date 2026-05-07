import { NextRequest, NextResponse } from "next/server";
import type { PolymarketReference } from "@/components/prediction/types";

type GammaMarket = {
  id?: string;
  question?: string;
  slug?: string;
  endDate?: string;
  liquidity?: string | number;
  volume?: string | number;
  outcomes?: string;
  outcomePrices?: string;
};

function numberOrNull(value: unknown) {
  const number = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function parseJsonArray<T>(value: unknown, fallback: T[]) {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string") return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function isRelevant(asset: string, market: GammaMarket) {
  const haystack = `${market.question ?? ""} ${market.slug ?? ""}`.toLowerCase();
  if (asset === "BTC") return /\b(bitcoin|btc)\b/.test(haystack);
  if (asset === "SOL") return /\b(solana|sol)\b/.test(haystack);
  return false;
}

function normalizeMarket(market: GammaMarket): PolymarketReference {
  return {
    id: String(market.id ?? market.slug ?? crypto.randomUUID()),
    question: market.question ?? "Untitled market",
    slug: market.slug ?? "",
    endDate: market.endDate ?? null,
    liquidity: numberOrNull(market.liquidity),
    volume: numberOrNull(market.volume),
    outcomes: parseJsonArray<string>(market.outcomes, []),
    outcomePrices: parseJsonArray<string | number>(market.outcomePrices, []).map((value) => numberOrNull(value) ?? 0),
  };
}

export async function GET(req: NextRequest) {
  const asset = (new URL(req.url).searchParams.get("asset") ?? "BTC").toUpperCase();
  const query = asset === "SOL" ? "Solana" : "Bitcoin";

  try {
    const url = new URL("https://gamma-api.polymarket.com/markets");
    url.searchParams.set("active", "true");
    url.searchParams.set("closed", "false");
    url.searchParams.set("limit", "30");
    url.searchParams.set("search", query);

    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`Polymarket Gamma failed (${res.status})`);
    const json = (await res.json()) as GammaMarket[];
    const references = json
      .filter((market) => isRelevant(asset, market))
      .map(normalizeMarket)
      .sort((a, b) => (b.liquidity ?? 0) - (a.liquidity ?? 0))
      .slice(0, 5);

    return NextResponse.json({ asset, references }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Polymarket references.";
    return NextResponse.json({ asset, references: [], warning: message }, { status: 200 });
  }
}
