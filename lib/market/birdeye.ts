import { SOLANA_TOKEN_DATA } from "@/lib/market/solanaTokenData";
import { fetchSolanaAccountInfo } from "@/lib/market/helius";
import { PublicKey } from "@solana/web3.js";

export type BirdeyeTokenSnapshot = {
  symbol: string;
  name: string;
  mint: string;
  priceUsd: number | null;
  priceChange24hPct: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  holders: number | null;
  source: "birdeye";
  warning?: string;
};

export type BirdeyeTokenContext = {
  available: boolean;
  requestedSymbols: string[];
  snapshots: BirdeyeTokenSnapshot[];
  warning?: string;
};

export type BirdeyeTokenRisk = {
  available: boolean;
  query: string;
  symbol: string;
  name: string;
  mint: string;
  overview: {
    priceUsd: number | null;
    priceChange24hPct: number | null;
    volume24hUsd: number | null;
    liquidityUsd: number | null;
    marketCapUsd: number | null;
    fdvUsd: number | null;
    holders: number | null;
  };
  security: {
    mutableMetadata: boolean | null;
    freezeAuthority: string | null;
    mintAuthority: string | null;
    top10HolderPct: number | null;
    creatorPct: number | null;
    ownerPct: number | null;
    isJupiterStrict: boolean | null;
  };
  score: number;
  label: "lower" | "medium" | "high" | "unknown";
  checks: Array<{ label: string; status: "ok" | "warn" | "danger" | "unknown"; detail: string }>;
  warnings: string[];
  source: "birdeye";
};

type JsonRecord = Record<string, unknown>;
type BirdeyeJson = { success?: boolean; data?: JsonRecord; message?: string };
type BirdeyeCacheEntry = { atMs: number; promise: Promise<BirdeyeJson> };

const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";
const BIRDEYE_CACHE_TTL_MS = 60 * 1000;
const DEFAULT_HEADERS = {
  Accept: "application/json",
  "x-chain": "solana",
} as const;

declare global {
  var __wispBirdeyeJsonCache: Map<string, BirdeyeCacheEntry> | undefined;
}

export function toBirdeyeNumber(value: unknown) {
  const number = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as JsonRecord) : undefined;
}

function firstNumber(source: JsonRecord | undefined, keys: string[]) {
  if (!source) return null;
  for (const key of keys) {
    const value = toBirdeyeNumber(source[key]);
    if (value !== null) return value;
  }
  return null;
}

function firstString(source: JsonRecord | undefined, keys: string[]) {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstBoolean(source: JsonRecord | undefined, keys: string[]) {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string" && /^(true|false)$/i.test(value)) return value.toLowerCase() === "true";
  }
  return null;
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function detectSolanaTokenSymbols(message: string, max = 4) {
  const upperMessage = message.toUpperCase();
  const symbols = Object.keys(SOLANA_TOKEN_DATA).sort((a, b) => b.length - a.length);
  const detected: string[] = [];

  for (const symbol of symbols) {
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`).test(upperMessage)) {
      detected.push(symbol);
    }
    if (detected.length >= max) break;
  }

  return detected;
}

function birdeyeCacheKey(path: string, query: Record<string, string>) {
  const params = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return `${path}?${params}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchBirdeyeJson(path: string, query: Record<string, string>, apiKey: string) {
  const cache = globalThis.__wispBirdeyeJsonCache ?? new Map<string, BirdeyeCacheEntry>();
  globalThis.__wispBirdeyeJsonCache = cache;
  const cacheKey = birdeyeCacheKey(path, query);
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.atMs < BIRDEYE_CACHE_TTL_MS) {
    return cached.promise;
  }

  const url = new URL(path, BIRDEYE_BASE_URL);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const promise = (async () => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await fetch(url, {
        headers: {
          ...DEFAULT_HEADERS,
          "X-API-KEY": apiKey,
        },
        next: { revalidate: 60 },
      });
      const text = await res.text().catch(() => "");
      let json: BirdeyeJson | null = null;
      try {
        json = text ? (JSON.parse(text) as BirdeyeJson) : null;
      } catch {
        json = null;
      }

      const message = typeof json?.message === "string" && json.message.trim() ? json.message.trim() : text.slice(0, 140);
      if (res.status === 429 && attempt < 2) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 700 * (attempt + 1));
        continue;
      }

      if (!res.ok || json?.success === false) {
        lastError = new Error(`Birdeye ${path} failed (${res.status})${message ? `: ${message.slice(0, 140)}` : ""}`);
        break;
      }

      return {
        success: json?.success,
        data: asRecord(json?.data),
        message: json?.message,
      };
    }

    throw lastError ?? new Error(`Birdeye ${path} failed.`);
  })();

  cache.set(cacheKey, { atMs: now, promise });
  promise.catch(() => {
    if (cache.get(cacheKey)?.promise === promise) cache.delete(cacheKey);
  });

  return promise;
}

function overviewFromData(overviewData: JsonRecord | undefined, priceData?: JsonRecord) {
  return {
    priceUsd: firstNumber(overviewData, ["price", "priceUsd", "priceUSD"]) ?? firstNumber(priceData, ["value", "price", "priceUsd"]),
    priceChange24hPct: firstNumber(overviewData, ["priceChange24hPercent", "priceChange24h", "priceChange24hPct"]),
    volume24hUsd: firstNumber(overviewData, ["v24hUSD", "volume24hUSD", "volume24hUsd", "volume24h", "trade24h"]),
    liquidityUsd: firstNumber(overviewData, ["liquidity", "liquidityUsd", "liquidityUSD"]),
    marketCapUsd: firstNumber(overviewData, ["mc", "marketCap", "marketCapUsd", "marketCapUSD"]),
    fdvUsd: firstNumber(overviewData, ["fdv", "fdvUsd", "fdvUSD"]),
    holders: firstNumber(overviewData, ["holder", "holders", "holderCount", "numberHolders"]),
  };
}

function tokenFromSymbolOrMint(value: string) {
  const normalized = normalizeSymbol(value);
  const known = SOLANA_TOKEN_DATA[normalized];
  if (known) return { symbol: normalized, name: known.name, mint: known.address };
  const byMint = Object.entries(SOLANA_TOKEN_DATA).find(([, token]) => token.address === value);
  if (byMint) return { symbol: byMint[0], name: byMint[1].name, mint: byMint[1].address };
  return { symbol: normalized || value.slice(0, 6), name: normalized || value, mint: value };
}

function readMintAuthority(bytes: Buffer, offset: number) {
  if (bytes.length < offset + 36) return null;
  const option = bytes.readUInt32LE(offset);
  if (option === 0) return null;
  return new PublicKey(bytes.subarray(offset + 4, offset + 36)).toBase58();
}

async function fetchMintAuthoritiesFromRpc(mint: string) {
  const account = await fetchSolanaAccountInfo(mint);
  const rawData = account.value?.data;
  const base64 = Array.isArray(rawData) ? rawData[0] : typeof rawData === "string" ? rawData : null;
  if (!base64) throw new Error("Solana RPC mint account returned no base64 data.");

  const bytes = Buffer.from(base64, "base64");
  if (bytes.length < 82) throw new Error("Solana RPC mint account data is shorter than the SPL mint layout.");

  return {
    mintAuthority: readMintAuthority(bytes, 0),
    freezeAuthority: readMintAuthority(bytes, 46),
  };
}

async function fetchBirdeyeTokenSnapshot(symbol: string, apiKey: string): Promise<BirdeyeTokenSnapshot> {
  const token = SOLANA_TOKEN_DATA[normalizeSymbol(symbol)];
  if (!token) {
    return {
      symbol,
      name: symbol,
      mint: "",
      priceUsd: null,
      priceChange24hPct: null,
      volume24hUsd: null,
      liquidityUsd: null,
      marketCapUsd: null,
      fdvUsd: null,
      holders: null,
      source: "birdeye",
      warning: "Unknown Solana token symbol.",
    };
  }

  const warnings: string[] = [];
  const [priceResult, overviewResult] = await Promise.allSettled([
    fetchBirdeyeJson("/defi/price", { address: token.address }, apiKey),
    fetchBirdeyeJson("/defi/token_overview", { address: token.address }, apiKey),
  ]);

  const priceData = priceResult.status === "fulfilled" ? priceResult.value.data : undefined;
  const overviewData = overviewResult.status === "fulfilled" ? overviewResult.value.data : undefined;

  if (priceResult.status === "rejected") warnings.push(priceResult.reason instanceof Error ? priceResult.reason.message : "Birdeye price failed.");
  if (overviewResult.status === "rejected") warnings.push(overviewResult.reason instanceof Error ? overviewResult.reason.message : "Birdeye overview failed.");
  const overview = overviewFromData(overviewData, priceData);

  return {
    symbol: normalizeSymbol(symbol),
    name: (typeof overviewData?.name === "string" && overviewData.name) || token.name,
    mint: token.address,
    ...overview,
    source: "birdeye",
    warning: warnings.length ? warnings.join(" | ") : undefined,
  };
}

export async function fetchBirdeyeTokenContext(symbols: string[]): Promise<BirdeyeTokenContext> {
  const requestedSymbols = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))].slice(0, 4);
  if (requestedSymbols.length === 0) {
    return { available: true, requestedSymbols, snapshots: [] };
  }

  const apiKey = process.env.BIRDEYE_API_KEY?.trim();
  if (!apiKey) {
    return {
      available: false,
      requestedSymbols,
      snapshots: [],
      warning: "BIRDEYE_API_KEY is not configured on the server.",
    };
  }

  const snapshots = await Promise.all(requestedSymbols.map((symbol) => fetchBirdeyeTokenSnapshot(symbol, apiKey)));
  return {
    available: true,
    requestedSymbols,
    snapshots,
  };
}

function riskCheck(args: {
  label: string;
  ok?: boolean;
  danger?: boolean;
  unknown?: boolean;
  detail: string;
}) {
  return {
    label: args.label,
    status: args.unknown ? "unknown" : args.danger ? "danger" : args.ok ? "ok" : "warn",
    detail: args.detail,
  } as const;
}

function computeRiskScore(checks: BirdeyeTokenRisk["checks"]) {
  let score = 100;
  for (const check of checks) {
    if (check.status === "danger") score -= 25;
    if (check.status === "warn") score -= 12;
    if (check.status === "unknown") score -= 6;
  }
  return Math.max(0, Math.min(100, score));
}

function scoreLabel(score: number): BirdeyeTokenRisk["label"] {
  if (score >= 78) return "lower";
  if (score >= 55) return "medium";
  if (score >= 1) return "high";
  return "unknown";
}

export async function fetchBirdeyeTokenRisk(query: string): Promise<BirdeyeTokenRisk> {
  const apiKey = process.env.BIRDEYE_API_KEY?.trim();
  const token = tokenFromSymbolOrMint(query);
  if (!apiKey) {
    return {
      available: false,
      query,
      symbol: token.symbol,
      name: token.name,
      mint: token.mint,
      overview: {
        priceUsd: null,
        priceChange24hPct: null,
        volume24hUsd: null,
        liquidityUsd: null,
        marketCapUsd: null,
        fdvUsd: null,
        holders: null,
      },
      security: {
        mutableMetadata: null,
        freezeAuthority: null,
        mintAuthority: null,
        top10HolderPct: null,
        creatorPct: null,
        ownerPct: null,
        isJupiterStrict: null,
      },
      score: 0,
      label: "unknown",
      checks: [],
      warnings: ["BIRDEYE_API_KEY is not configured on the server."],
      source: "birdeye",
    };
  }

  const warnings: string[] = [];
  const [priceResult, overviewResult, securityResult, holderResult] = await Promise.allSettled([
    fetchBirdeyeJson("/defi/price", { address: token.mint }, apiKey),
    fetchBirdeyeJson("/defi/token_overview", { address: token.mint }, apiKey),
    fetchBirdeyeJson("/defi/token_security", { address: token.mint }, apiKey),
    fetchBirdeyeJson("/token/v1/holder-profile", { token_address: token.mint }, apiKey),
  ]);

  const priceData = priceResult.status === "fulfilled" ? priceResult.value.data : undefined;
  const overviewData = overviewResult.status === "fulfilled" ? overviewResult.value.data : undefined;
  const securityData = securityResult.status === "fulfilled" ? securityResult.value.data : undefined;
  const holderData = holderResult.status === "fulfilled" ? holderResult.value.data : undefined;
  const holderTokenData = asRecord(holderData?.token);
  const holderSummaryData = asRecord(holderData?.holder_summary);
  const top10HolderData = asRecord(holderTokenData?.top10_holder) ?? asRecord(holderData?.top10_holder);

  if (priceResult.status === "rejected") warnings.push(priceResult.reason instanceof Error ? priceResult.reason.message : "Birdeye price failed.");
  if (overviewResult.status === "rejected") warnings.push(overviewResult.reason instanceof Error ? overviewResult.reason.message : "Birdeye token overview failed.");
  if (securityResult.status === "rejected") warnings.push(securityResult.reason instanceof Error ? securityResult.reason.message : "Birdeye token security failed.");
  if (holderResult.status === "rejected") warnings.push(holderResult.reason instanceof Error ? holderResult.reason.message : "Birdeye holder profile failed.");

  const overview = overviewFromData(overviewData, priceData);
  const liquidityUsd = overview.liquidityUsd ?? firstNumber(holderTokenData, ["liquidity", "liquidityUsd", "liquidity_usd"]);
  const volume24hUsd = overview.volume24hUsd ?? firstNumber(holderTokenData, ["volume_24h_usd", "volume24hUsd", "v24hUSD"]);
  const marketCapUsd = overview.marketCapUsd ?? firstNumber(holderTokenData, ["market_cap", "marketCap"]);
  const holders = overview.holders
    ?? firstNumber(holderSummaryData, ["total_holder", "totalHolder", "holders", "holderCount"])
    ?? firstNumber(holderData, ["holder", "holders", "holderCount", "totalHolder"]);
  const top10HolderPct = firstNumber(securityData, ["top10HolderPercent", "top10HolderPct", "top10Percent", "top10HolderBalanceRatio"])
    ?? firstNumber(top10HolderData, ["percent_of_supply", "percentOfSupply", "percent", "pct"])
    ?? firstNumber(holderTokenData, ["top10HolderPercent", "top10HolderPct", "top10Percent"]);
  const creatorPct = firstNumber(securityData, ["creatorBalanceRatio", "creatorPercentage", "creatorPct"]);
  const ownerPct = firstNumber(securityData, ["ownerBalanceRatio", "ownerPercentage", "ownerPct"]);
  let freezeAuthority = firstString(securityData, ["freezeAuthority", "freeze_authority"]);
  let mintAuthority = firstString(securityData, ["mintAuthority", "mint_authority"]);
  let authorityDataAvailable = securityData !== undefined;
  if (!authorityDataAvailable) {
    try {
      const authorities = await fetchMintAuthoritiesFromRpc(token.mint);
      freezeAuthority = authorities.freezeAuthority;
      mintAuthority = authorities.mintAuthority;
      authorityDataAvailable = true;
    } catch (err: unknown) {
      warnings.push(err instanceof Error ? `Solana mint authority fallback failed: ${err.message}` : "Solana mint authority fallback failed.");
    }
  }
  const mutableMetadata = firstBoolean(securityData, ["mutableMetadata", "metadataMutable", "isMutable"]);
  const isJupiterStrict = firstBoolean(securityData, ["isJupiterStrict", "jupiterStrict", "jupStrict"]);

  const checks: BirdeyeTokenRisk["checks"] = [
    riskCheck({
      label: "Liquidity",
      ok: liquidityUsd !== null && liquidityUsd >= 250_000,
      danger: liquidityUsd !== null && liquidityUsd < 50_000,
      unknown: liquidityUsd === null,
      detail: liquidityUsd === null ? "No liquidity value returned." : `$${Math.round(liquidityUsd).toLocaleString()} liquidity.`,
    }),
    riskCheck({
      label: "24h volume",
      ok: volume24hUsd !== null && volume24hUsd >= 100_000,
      danger: volume24hUsd !== null && volume24hUsd < 10_000,
      unknown: volume24hUsd === null,
      detail: volume24hUsd === null ? "No 24h volume returned." : `$${Math.round(volume24hUsd).toLocaleString()} traded in 24h.`,
    }),
    riskCheck({
      label: "Holder base",
      ok: holders !== null && holders >= 2_000,
      danger: holders !== null && holders < 250,
      unknown: holders === null,
      detail: holders === null ? "No holder count returned." : `${Math.round(holders).toLocaleString()} holders.`,
    }),
    riskCheck({
      label: "Top holders",
      ok: top10HolderPct !== null && top10HolderPct <= 25,
      danger: top10HolderPct !== null && top10HolderPct >= 50,
      unknown: top10HolderPct === null,
      detail: top10HolderPct === null ? "Top holder concentration unavailable." : `Top 10 hold about ${top10HolderPct.toFixed(2)}%.`,
    }),
    riskCheck({
      label: "Authorities",
      ok: !freezeAuthority && !mintAuthority,
      danger: Boolean(freezeAuthority || mintAuthority),
      unknown: !authorityDataAvailable,
      detail: !authorityDataAvailable
        ? "Authority data unavailable."
        : freezeAuthority || mintAuthority
          ? "Mint/freeze authority appears present."
          : "Mint/freeze authorities are not set.",
    }),
    riskCheck({
      label: "Metadata",
      ok: mutableMetadata === false,
      danger: mutableMetadata === true,
      unknown: mutableMetadata === null,
      detail: mutableMetadata === null ? "Metadata mutability unavailable." : mutableMetadata ? "Metadata appears mutable." : "Metadata appears immutable.",
    }),
  ];

  const score = computeRiskScore(checks);
  return {
    available: true,
    query,
    symbol: token.symbol,
    name: (typeof overviewData?.name === "string" && overviewData.name) || token.name,
    mint: token.mint,
    overview: {
      priceUsd: overview.priceUsd,
      priceChange24hPct: overview.priceChange24hPct,
      volume24hUsd,
      liquidityUsd,
      marketCapUsd,
      fdvUsd: overview.fdvUsd,
      holders,
    },
    security: {
      mutableMetadata,
      freezeAuthority,
      mintAuthority,
      top10HolderPct,
      creatorPct,
      ownerPct,
      isJupiterStrict,
    },
    score,
    label: scoreLabel(score),
    checks,
    warnings,
    source: "birdeye",
  };
}
