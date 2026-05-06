type TokenWithSymbol = { symbol?: string };

let cache:
  | { atMs: number; symbols: Set<string> }
  | null = null;

const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h

export async function getSolanaTokenSymbols(): Promise<Set<string>> {
  const now = Date.now();
  if (cache && now - cache.atMs < CACHE_TTL_MS) return cache.symbols;

  const urls = [
    // Legacy Jupiter list (fast, but can be blocked by DNS in some envs)
    "https://token.jup.ag/all",
    // Canonical Solana token registry (large but reliable)
    "https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json",
  ];

  let tokens: TokenWithSymbol[] | null = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, { next: { revalidate: 60 * 60 * 6 } });
      if (!res.ok) continue;
      const json = (await res.json()) as unknown;

      if (Array.isArray(json)) {
        tokens = json as TokenWithSymbol[];
        break;
      }

      if (json && typeof json === "object" && "tokens" in (json as Record<string, unknown>)) {
        const t = (json as { tokens?: unknown }).tokens;
        if (Array.isArray(t)) {
          tokens = t as TokenWithSymbol[];
          break;
        }
      }
    } catch {
      // try next URL
    }
  }

  if (!tokens) throw new Error("Token list fetch failed");
  const symbols = new Set<string>();

  for (const t of tokens) {
    const s = (t.symbol ?? "").trim().toUpperCase();
    if (s) symbols.add(s);
  }

  // Always include SOL even if list hiccups.
  symbols.add("SOL");

  cache = { atMs: now, symbols };
  return symbols;
}

