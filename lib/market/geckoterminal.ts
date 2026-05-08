export type GeckoPool = {
  id: string; // e.g. "solana_<poolAddress>"
  attributes: {
    name: string;
    base_token_price_usd?: string;
    quote_token_price_usd?: string;
    price_in_usd?: string;
    price_change_percentage?: Record<string, string>;
    volume_usd?: Record<string, string>;
  };
  relationships?: {
    base_token?:  { data?: { id?: string } };
    quote_token?: { data?: { id?: string } };
  };
};

export type GeckoOHLCV = Array<
  [
    number, // timestamp (seconds)
    number, // open
    number, // high
    number, // low
    number, // close
    number // volume
  ]
>;

const BASE = "https://api.geckoterminal.com/api/v2";

const DEFAULT_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Wisp/0.1 (+https://wisp.trade)",
} as const;

export async function fetchTokenTopPool(mint: string): Promise<GeckoPool | null> {
  const url = `${BASE}/networks/solana/tokens/${encodeURIComponent(mint)}/pools?page=1`;
  const res = await fetch(url, { next: { revalidate: 300 }, headers: DEFAULT_HEADERS });
  if (res.status === 429) throw new Error("GeckoTerminal rate limited (429)");
  if (!res.ok) throw new Error(`Gecko token pools failed (${res.status})`);
  const json = (await res.json()) as { data?: GeckoPool[] };
  const pools = Array.isArray(json.data) ? json.data : [];
  return pools[0] ?? null;
}

async function fetchWithRetry(url: string, opts: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, opts);
    if (res.status === 429 && attempt < retries) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }
    return res;
  }
  throw new Error("Max retries exceeded");
}

export async function fetchPoolOHLCV(opts: {
  poolId: string;
  timeframe: "minute" | "hour" | "day";
  aggregate: number;
  limit: number;
}) {
  const { poolId, timeframe, aggregate, limit } = opts;
  // GeckoTerminal OHLCV path takes the bare on-chain address without "solana_" prefix
  const address = poolId.startsWith("solana_") ? poolId.slice(7) : poolId;
  // GeckoTerminal max: 1000 candles; cap per timeframe to stay well under limits
  const safeLimit = Math.min(limit, timeframe === "minute" ? 500 : timeframe === "hour" ? 300 : 100);
  const url = `${BASE}/networks/solana/pools/${encodeURIComponent(address)}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${safeLimit}`;
  const res = await fetchWithRetry(url, { next: { revalidate: 60 }, headers: DEFAULT_HEADERS });
  if (!res.ok) {
    let detail = "";
    try { const t = await res.text(); detail = t.slice(0, 120); } catch { /* ignore */ }
    throw new Error(`Gecko ohlcv ${res.status}${detail ? ": " + detail : ""}`);
  }
  const json = (await res.json()) as { data?: { attributes?: { ohlcv_list?: GeckoOHLCV } } };
  const list = json.data?.attributes?.ohlcv_list;
  return Array.isArray(list) ? list : [];
}

