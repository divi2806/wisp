type TokenEntry = {
  address?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  logoURI?: string;
};

type TokenList = {
  tokens?: TokenEntry[];
};

let cache:
  | {
      atMs: number;
      bySymbol: Map<string, TokenEntry>;
    }
  | null = null;

const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h

const FALLBACK_URL =
  "https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json";

export async function getSolanaTokenRegistryBySymbol(): Promise<Map<string, TokenEntry>> {
  const now = Date.now();
  if (cache && now - cache.atMs < CACHE_TTL_MS) return cache.bySymbol;

  const res = await fetch(FALLBACK_URL, { next: { revalidate: 60 * 60 * 6 } });
  if (!res.ok) throw new Error(`Token registry failed (${res.status})`);

  const json = (await res.json()) as TokenList;
  const tokens = Array.isArray(json.tokens) ? json.tokens : [];

  const bySymbol = new Map<string, TokenEntry>();
  for (const t of tokens) {
    const sym = (t.symbol ?? "").trim().toUpperCase();
    if (!sym) continue;
    if (!bySymbol.has(sym)) bySymbol.set(sym, t);
  }

  // wSOL mint for SOL
  bySymbol.set("SOL", {
    symbol: "SOL",
    name: "Wrapped SOL",
    address: "So11111111111111111111111111111111111111112",
    decimals: 9,
  });

  cache = { atMs: now, bySymbol };
  return bySymbol;
}

