import { NextRequest, NextResponse } from "next/server";
import { SOLANA_TOKEN_DATA } from "@/lib/market/solanaTokenData";
import { fetchTokenTopPool } from "@/lib/market/geckoterminal";

// Per-symbol pool ID cache (in-memory, survives warm instances)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
if (!g.__wispPoolCache) g.__wispPoolCache = new Map<string, { poolId: string; atMs: number }>();
const poolCache = g.__wispPoolCache as Map<string, { poolId: string; atMs: number }>;

const TTL = 10 * 60_000; // 10 minutes — pool IDs rarely change

export async function GET(req: NextRequest) {
  const symbol = (new URL(req.url).searchParams.get("symbol") ?? "").toUpperCase();
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const now = Date.now();
  const hit = poolCache.get(symbol);
  if (hit && now - hit.atMs < TTL) {
    return NextResponse.json({ symbol, poolId: hit.poolId });
  }

  const data = SOLANA_TOKEN_DATA[symbol];
  if (!data) return NextResponse.json({ symbol, poolId: "" });

  try {
    const pool = await fetchTokenTopPool(data.address);
    const poolId = pool?.id ?? "";
    poolCache.set(symbol, { poolId, atMs: now });
    return NextResponse.json({ symbol, poolId });
  } catch (err) {
    console.warn("[pool]", symbol, err instanceof Error ? err.message : err);
    // Return empty rather than 500 — chart will show "no pool" state gracefully
    return NextResponse.json({ symbol, poolId: "" });
  }
}
