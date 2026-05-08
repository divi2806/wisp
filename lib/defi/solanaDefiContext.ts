import { fetchPerpsContext, type PerpsContext } from "@/lib/defi/perps";
import { buildProtocolPositionContext, type ProtocolPositionContext } from "@/lib/defi/protocolPositions";
import { fetchTokenRiskContext, type TokenRiskContext } from "@/lib/defi/tokenRisk";
import {
  fetchWalletLookupContext,
  fetchWalletLookupContextForAddress,
  shouldFetchConnectedWalletContext,
  shouldFetchWalletContext,
  type WalletLookupContext,
} from "@/lib/defi/walletLookup";
import { detectSolanaTokenSymbols, fetchBirdeyeTokenContext, type BirdeyeTokenContext } from "@/lib/market/birdeye";

type RawLlamaYieldPool = Record<string, unknown>;
type LlamaYieldCache = { atMs: number; pools: RawLlamaYieldPool[] };

declare global {
  var __wispLlamaYieldPoolsCache: LlamaYieldCache | undefined;
}

export type RankedYieldPool = {
  protocol: string;
  pool: string;
  symbol: string;
  apy: number;
  baseApy: number | null;
  rewardApy: number | null;
  apyChange1d: number | null;
  apyChange7d: number | null;
  tvlUsd: number;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  riskTier: "lower" | "balanced" | "high";
  reason: string;
};

export type SolanaYieldContext = {
  source: "defillama-yields";
  fetchedAt: string;
  totalSolanaPools: number;
  screenedPools: number;
  topRiskAdjusted: RankedYieldPool[];
  topStablecoin: RankedYieldPool[];
  topSolExposure: RankedYieldPool[];
  topRawApy: RankedYieldPool[];
  matchedPools: RankedYieldPool[];
  warning?: string;
};

export type DashboardDeFiContext = {
  scope: "public_solana_defi_data";
  walletStatus: "not_connected" | "public_wallet_lookup" | "connected_wallet_lookup";
  personalDataLimit: string;
  yields: SolanaYieldContext | null;
  tokens: BirdeyeTokenContext;
  wallet: WalletLookupContext | null;
  tokenRisk: TokenRiskContext | null;
  perps: PerpsContext | null;
  protocolPositions: ProtocolPositionContext | null;
};

const LLAMA_YIELDS_URL = "https://yields.llama.fi/pools";
const MIN_TVL_USD = 100_000;
const MAX_CONTEXT_POOLS = 7;
const LLAMA_CACHE_TTL_MS = 5 * 60 * 1000;
const SOL_EXPOSURE_RE = /\b(SOL|MSOL|JITOSOL|BSOL|STSOL|INF|JLP)\b/i;

function toNumber(value: unknown) {
  const number = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function round(value: number | null, decimals = 2) {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function compactPoolName(raw: RawLlamaYieldPool) {
  return (
    toStringValue(raw.poolMeta) ||
    toStringValue(raw.pool) ||
    toStringValue(raw.symbol) ||
    "Unknown pool"
  ).slice(0, 90);
}

function normalizePool(raw: RawLlamaYieldPool): RankedYieldPool | null {
  const chain = toStringValue(raw.chain).toLowerCase();
  if (chain !== "solana") return null;

  const apy = toNumber(raw.apy);
  const tvlUsd = toNumber(raw.tvlUsd);
  if (apy === null || tvlUsd === null || apy <= 0 || tvlUsd < MIN_TVL_USD) return null;

  const protocol = toStringValue(raw.project, "unknown");
  const symbol = toStringValue(raw.symbol, "UNKNOWN");
  const ilRisk = toStringValue(raw.ilRisk, "unknown").toLowerCase();
  const exposure = toStringValue(raw.exposure, "unknown").toLowerCase();
  const stablecoin = raw.stablecoin === true || raw.stablecoin === "true";
  const rewardApy = toNumber(raw.apyReward);
  const apyChange7d = toNumber(raw.apyPct7D);
  const rewardHeavy = rewardApy !== null && rewardApy > Math.max(20, apy * 0.65);

  const riskTier =
    apy >= 80 || tvlUsd < 500_000 || rewardHeavy
      ? "high"
      : stablecoin && ilRisk === "no" && apy <= 35 && tvlUsd >= 1_000_000
        ? "lower"
        : "balanced";

  const reasonParts = [
    stablecoin ? "stablecoin" : "volatile exposure",
    ilRisk === "no" ? "no listed IL risk" : `${ilRisk} IL risk`,
    `${formatUsd(tvlUsd)} TVL`,
    apyChange7d !== null ? `${apyChange7d >= 0 ? "+" : ""}${round(apyChange7d, 1)}pt 7d APY change` : null,
  ].filter(Boolean);

  return {
    protocol,
    pool: compactPoolName(raw),
    symbol,
    apy: round(apy) ?? apy,
    baseApy: round(toNumber(raw.apyBase)),
    rewardApy: round(rewardApy),
    apyChange1d: round(toNumber(raw.apyPct1D)),
    apyChange7d: round(apyChange7d),
    tvlUsd: Math.round(tvlUsd),
    stablecoin,
    ilRisk,
    exposure,
    riskTier,
    reason: reasonParts.join(" | "),
  };
}

function formatUsd(value: number) {
  if (value >= 1_000_000_000) return `$${round(value / 1_000_000_000, 2)}B`;
  if (value >= 1_000_000) return `$${round(value / 1_000_000, 1)}M`;
  if (value >= 1_000) return `$${round(value / 1_000, 1)}K`;
  return `$${Math.round(value)}`;
}

function riskAdjustedScore(pool: RankedYieldPool) {
  const tvlScore = clamp(Math.log10(Math.max(pool.tvlUsd, 1)) * 3, 0, 22);
  const trendScore = pool.apyChange7d === null ? 0 : clamp(pool.apyChange7d * 0.25, -8, 8);
  const ilPenalty = pool.ilRisk === "no" ? 0 : 10;
  const riskPenalty = pool.riskTier === "high" ? 18 : pool.riskTier === "balanced" ? 4 : 0;
  const apyScore = Math.min(pool.apy, 75);
  return apyScore + tvlScore + trendScore - ilPenalty - riskPenalty;
}

function byScore(a: RankedYieldPool, b: RankedYieldPool) {
  return riskAdjustedScore(b) - riskAdjustedScore(a);
}

function byApy(a: RankedYieldPool, b: RankedYieldPool) {
  return b.apy - a.apy;
}

function uniquePools(pools: RankedYieldPool[]) {
  const seen = new Set<string>();
  const output: RankedYieldPool[] = [];

  for (const pool of pools) {
    const key = `${pool.protocol}:${pool.pool}:${pool.symbol}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(pool);
  }

  return output;
}

function matchesMessage(pool: RankedYieldPool, message: string) {
  const query = message.toLowerCase();
  if (!query.trim()) return false;
  const haystack = `${pool.protocol} ${pool.pool} ${pool.symbol} ${pool.exposure}`.toLowerCase();
  return query
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3)
    .some((term) => haystack.includes(term));
}

async function fetchSolanaYieldContext(message: string): Promise<SolanaYieldContext> {
  try {
    const rawPools = await fetchLlamaYieldPools();
    const solanaPools = rawPools.filter((pool) => toStringValue(pool.chain).toLowerCase() === "solana");
    const screened = uniquePools(solanaPools.map(normalizePool).filter((pool): pool is RankedYieldPool => Boolean(pool)));
    const credible = screened.filter((pool) => pool.apy <= 250);

    return {
      source: "defillama-yields",
      fetchedAt: new Date().toISOString(),
      totalSolanaPools: solanaPools.length,
      screenedPools: credible.length,
      topRiskAdjusted: [...credible].sort(byScore).slice(0, MAX_CONTEXT_POOLS),
      topStablecoin: credible
        .filter((pool) => pool.stablecoin)
        .sort(byScore)
        .slice(0, MAX_CONTEXT_POOLS),
      topSolExposure: credible
        .filter((pool) => SOL_EXPOSURE_RE.test(pool.symbol) || SOL_EXPOSURE_RE.test(pool.pool))
        .sort(byScore)
        .slice(0, MAX_CONTEXT_POOLS),
      topRawApy: [...credible].sort(byApy).slice(0, MAX_CONTEXT_POOLS),
      matchedPools: credible
        .filter((pool) => matchesMessage(pool, message))
        .sort(byScore)
        .slice(0, MAX_CONTEXT_POOLS),
    };
  } catch (err: unknown) {
    return {
      source: "defillama-yields",
      fetchedAt: new Date().toISOString(),
      totalSolanaPools: 0,
      screenedPools: 0,
      topRiskAdjusted: [],
      topStablecoin: [],
      topSolExposure: [],
      topRawApy: [],
      matchedPools: [],
      warning: err instanceof Error ? err.message : String(err),
    };
  }
}

async function fetchLlamaYieldPools() {
  const now = Date.now();
  const cached = globalThis.__wispLlamaYieldPoolsCache;
  if (cached && now - cached.atMs < LLAMA_CACHE_TTL_MS) {
    return cached.pools;
  }

  const res = await fetch(LLAMA_YIELDS_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DefiLlama yields failed (${res.status})${text ? `: ${text.slice(0, 140)}` : ""}`);
  }

  const json = (await res.json()) as { data?: RawLlamaYieldPool[] };
  const pools = Array.isArray(json.data) ? json.data : [];
  globalThis.__wispLlamaYieldPoolsCache = { atMs: now, pools };
  return pools;
}

function shouldAddDefaultDeFiTokens(message: string, detectedSymbols: string[]) {
  if (detectedSymbols.length > 0) return detectedSymbols;
  if (!/\b(market|tokens?|price|volume|liquidity|jupiter|kamino|raydium|orca|drift|jito)\b/i.test(message)) {
    return detectedSymbols;
  }
  return ["SOL", "JUP", "JTO", "KMNO"];
}

export async function buildDashboardDeFiContext(args: {
  message: string;
  connectedWalletAddress?: string | null;
}): Promise<DashboardDeFiContext> {
  const detectedSymbols = shouldAddDefaultDeFiTokens(args.message, detectSolanaTokenSymbols(args.message));
  const hasExplicitWallet = shouldFetchWalletContext(args.message);
  const shouldUseConnectedWallet =
    !hasExplicitWallet &&
    Boolean(args.connectedWalletAddress) &&
    shouldFetchConnectedWalletContext(args.message);
  const [yieldsResult, tokensResult, walletResult, tokenRiskResult, perpsResult] = await Promise.allSettled([
    fetchSolanaYieldContext(args.message),
    fetchBirdeyeTokenContext(detectedSymbols),
    hasExplicitWallet
      ? fetchWalletLookupContext(args.message)
      : shouldUseConnectedWallet && args.connectedWalletAddress
        ? fetchWalletLookupContextForAddress(args.connectedWalletAddress)
        : Promise.resolve(null),
    fetchTokenRiskContext(args.message),
    fetchPerpsContext(args.message),
  ]);
  const wallet = walletResult.status === "fulfilled" ? walletResult.value : null;
  const tokenRisk = tokenRiskResult.status === "fulfilled" ? tokenRiskResult.value : null;
  const perps = perpsResult.status === "fulfilled" ? perpsResult.value : null;
  const protocolPositions = await buildProtocolPositionContext(args.message, wallet);

  return {
    scope: "public_solana_defi_data",
    walletStatus: wallet?.resolvedAddress
      ? shouldUseConnectedWallet
        ? "connected_wallet_lookup"
        : "public_wallet_lookup"
      : "not_connected",
    personalDataLimit:
      wallet?.resolvedAddress && shouldUseConnectedWallet
        ? "A connected wallet public key is available. Treat it as public read-only wallet data; do not claim private/off-chain data and do not imply transaction authority unless the user signs later."
        : "Public wallet lookups are available when the user provides an address/.sol. Without a connected wallet or provided public address, do not claim exact personal balances, PnL, liquidation, or protocol exposure.",
    yields: yieldsResult.status === "fulfilled" ? yieldsResult.value : null,
    tokens:
      tokensResult.status === "fulfilled"
        ? tokensResult.value
        : {
            available: false,
            requestedSymbols: detectedSymbols,
            snapshots: [],
            warning: tokensResult.reason instanceof Error ? tokensResult.reason.message : String(tokensResult.reason),
          },
    wallet,
    tokenRisk,
    perps,
    protocolPositions,
  };
}
