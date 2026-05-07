import { NextRequest, NextResponse } from "next/server";
import { buildDashboardDeFiContext, type DashboardDeFiContext, type RankedYieldPool } from "@/lib/defi/solanaDefiContext";
import { fetchPoolOHLCV, fetchTokenTopPool } from "@/lib/market/geckoterminal";
import { SOLANA_TOKEN_DATA } from "@/lib/market/solanaTokenData";

type TradeContext = {
  symbol?: string;
  interval?: string;
  candleType?: string;
  indicators?: Record<string, boolean>;
  livePrice?: number | null;
  recentCandles?: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>;
  indicatorValues?: {
    rsi14?: number | null;
    macd?: { macd: number; signal: number; hist: number } | null;
  };
  lastCandle?: { open: number; high: number; low: number; close: number; changePct?: number | null; rangePct?: number | null } | null;
  paper?: {
    enabled?: boolean;
    cashUSDT?: number;
    position?: number;
    qty?: number;
    avgEntry?: number | null;
    unrealizedPnL?: number | null;
    openOrdersCount?: number;
    fillsCount?: number;
    latestFills?: Array<{ atMs: number; side: "buy" | "sell"; qty: number; price: number; notional: number }>;
    openOrders?: Array<{
      id: string;
      atMs: number;
      side: "buy" | "sell";
      type: "market" | "limit";
      qty: number;
      limitPrice: number | null;
    }>;
  };
};

type PredictionContext = {
  activeMarket?: {
    label?: string;
    asset?: string;
    durationMinutes?: number;
    question?: string;
    startPrice?: number | null;
    livePrice?: number | null;
    yesPrice?: number | null;
    noPrice?: number | null;
    yesProbability?: number | null;
    changePct?: number | null;
    distanceUsd?: number | null;
    timeRemainingMs?: number | null;
    progressPct?: number | null;
    wsStatus?: string;
  };
  markets?: Array<{
    label?: string;
    livePrice?: number | null;
    yesPrice?: number | null;
    noPrice?: number | null;
    changePct?: number | null;
    timeRemainingMs?: number | null;
  }>;
  recentCandles?: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>;
  paper?: {
    cashUSDC?: number;
    portfolioValue?: number;
    activePosition?: {
      yesShares?: number;
      noShares?: number;
      yesAvg?: number | null;
      noAvg?: number | null;
    };
    openPositionsCount?: number;
    latestFills?: Array<{
      atMs: number;
      action: "buy" | "sell";
      side: "yes" | "no";
      shares: number;
      price: number;
      notional: number;
    }>;
    latestSettlements?: Array<{
      atMs: number;
      side: "yes" | "no";
      shares: number;
      avgPrice: number;
      finalPrice: number;
      outcome: "yes" | "no" | "draw";
      payout: number;
      pnl: number;
    }>;
  };
  polymarketReferences?: Array<{
    question: string;
    liquidity: number | null;
    volume: number | null;
    outcomes: string[];
    outcomePrices: number[];
  }>;
};

type RequestedMarketContext = {
  requestedSymbol: string;
  requestedName: string;
  mint: string;
  poolId: string;
  interval: string;
  livePrice: number | null;
  priceChange24hPct: number | null;
  volume24hUsd: number | null;
  recentCandles: NonNullable<TradeContext["recentCandles"]>;
  indicatorValues: NonNullable<TradeContext["indicatorValues"]>;
  lastCandle: TradeContext["lastCandle"];
  dataSource: "geckoterminal";
  warning?: string;
};

type ChatHistoryItem = {
  role?: "user" | "wisp" | "assistant";
  content?: string;
};

type AttachedFile = {
  name?: string;
  size?: string;
};

type DashboardVisual =
  | {
      kind: "yield-ranking";
      title: string;
      source: "DefiLlama";
      fetchedAt: string;
      buckets: Array<{
        label: string;
        tone: "green" | "cyan" | "amber";
        pools: Array<{
          protocol: string;
          symbol: string;
          apy: number;
          tvlUsd: number;
          riskTier: RankedYieldPool["riskTier"];
          reason: string;
        }>;
      }>;
    }
  | {
      kind: "token-snapshot";
      title: string;
      source: "Birdeye";
      tokens: Array<{
        symbol: string;
        name: string;
        priceUsd: number | null;
        priceChange24hPct: number | null;
        volume24hUsd: number | null;
        liquidityUsd: number | null;
        marketCapUsd: number | null;
      }>;
    }
  | {
      kind: "wallet-holdings";
      title: string;
      source: "Helius/Birdeye";
      address: string;
      label: string;
      totalValueUsd: number | null;
      nativeSol: { amount: number | null; valueUsd: number | null };
      tokenCount: number;
      tokens: Array<{ symbol: string; name: string; amount: number | null; valueUsd: number | null; priceUsd: number | null }>;
      protocolExposure: Array<{ protocol: string; reason: string; confidence: "low" | "medium" | "high" }>;
    }
  | {
      kind: "token-risk";
      title: string;
      source: "Birdeye";
      symbol: string;
      name: string;
      mint: string;
      score: number;
      label: "lower" | "medium" | "high" | "unknown";
      overview: {
        priceUsd: number | null;
        priceChange24hPct: number | null;
        volume24hUsd: number | null;
        liquidityUsd: number | null;
        marketCapUsd: number | null;
        fdvUsd: number | null;
        holders: number | null;
      };
      checks: Array<{ label: string; status: "ok" | "warn" | "danger" | "unknown"; detail: string }>;
      warnings: string[];
    }
  | {
      kind: "perps-snapshot";
      title: string;
      source: "Drift/Jupiter/Flash";
      venue: string;
      market: string | null;
      snapshots: Array<{
        venue: "drift" | "jupiter" | "flash";
        market: string;
        priceUsd: number | null;
        fundingRate: number | null;
        openInterestUsd: number | null;
        volume24hUsd: number | null;
        longShortSkew: number | null;
      }>;
      warnings: string[];
    }
  | {
      kind: "protocol-positions";
      title: string;
      source: "Protocol decoders";
      protocols: Array<{
        protocol: string;
        status: "live" | "partial-live" | "market-live" | "needs-decoder" | "not-configured";
        provider: string;
        apiKeyRequired: boolean;
        walletRequirement: "none" | "public-address" | "connected-wallet";
        detail: string;
        needs: string[];
        positions?: Array<{
          label: string;
          positionType: "lend" | "perp" | "spot" | "clmm" | "amm" | "vault" | "unknown";
          suppliedUsd: number | null;
          borrowedUsd: number | null;
          netUsd: number | null;
          health: "no-borrow" | "lower-risk" | "watch" | "danger" | "unknown";
          deposits: Array<{ symbol: string; valueUsd: number | null; apy: number | null; amount?: number | null }>;
          borrows: Array<{ symbol: string; valueUsd: number | null; apy: number | null; amount?: number | null }>;
          metrics: Array<{ label: string; value: string; tone?: "neutral" | "good" | "warn" | "danger" }>;
        }>;
      }>;
      warnings: string[];
    };

type AzureResponsePart = {
  text?: string;
  value?: string;
};

type AzureResponseOutput = {
  content?: AzureResponsePart[];
};

type AzureTextResponse = {
  output_text?: string;
  output?: AzureResponseOutput[];
  choices?: Array<{
    text?: string;
    message?: {
      content?: string;
    };
  }>;
};

const DEFAULT_MODEL = "gpt-5-mini";
const AZURE_TIMEOUT_MS = 25_000;
const SUPPORTED_SYMBOLS = Object.keys(SOLANA_TOKEN_DATA);

function intervalToGecko(interval: string): { timeframe: "minute" | "hour" | "day"; aggregate: number } {
  switch (interval.toLowerCase()) {
    case "1m":
      return { timeframe: "minute", aggregate: 1 };
    case "5m":
      return { timeframe: "minute", aggregate: 5 };
    case "1h":
      return { timeframe: "hour", aggregate: 1 };
    case "4h":
      return { timeframe: "hour", aggregate: 4 };
    case "1d":
      return { timeframe: "day", aggregate: 1 };
    case "15m":
    default:
      return { timeframe: "minute", aggregate: 15 };
  }
}

function normalizeSymbol(value: string | undefined | null) {
  return (value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function detectRequestedSymbol(message: string, currentSymbol?: string) {
  const current = normalizeSymbol(currentSymbol);
  const upperMessage = message.toUpperCase();

  for (const symbol of SUPPORTED_SYMBOLS.sort((a, b) => b.length - a.length)) {
    if (symbol === current) continue;
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`).test(upperMessage)) {
      return symbol;
    }
  }

  return null;
}

function computeRSILast(closes: number[], period = 14) {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  let rsi = 100 - 100 / (1 + (loss === 0 ? 100 : gain / loss));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    rsi = 100 - 100 / (1 + (loss === 0 ? 100 : gain / loss));
  }
  return Number.isFinite(rsi) ? rsi : null;
}

function computeEMASeries(values: number[], period: number) {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let ema = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    ema =
      i === period - 1
        ? values.slice(0, period).reduce((s, v) => s + v, 0) / period
        : values[i] * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
}

function computeMACDLast(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = computeEMASeries(closes, fast);
  const emaSlow = computeEMASeries(closes, slow);
  if (!emaFast.length || !emaSlow.length) return null;
  const overlap = Math.min(emaFast.length, emaSlow.length);
  const macd = emaFast.slice(emaFast.length - overlap).map((v, i) => v - emaSlow[emaSlow.length - overlap + i]);
  const sig = computeEMASeries(macd, signal);
  if (!sig.length) return null;
  const macdLast = macd[macd.length - 1];
  const sigLast = sig[sig.length - 1];
  const histLast = macdLast - sigLast;
  if (![macdLast, sigLast, histLast].every((x) => Number.isFinite(x))) return null;
  return { macd: macdLast, signal: sigLast, hist: histLast };
}

function toNumber(value: string | number | undefined | null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function fetchRequestedMarketContext(args: {
  symbol: string;
  interval: string;
}): Promise<RequestedMarketContext | null> {
  const symbol = normalizeSymbol(args.symbol);
  const token = SOLANA_TOKEN_DATA[symbol];
  if (!token) return null;

  try {
    const pool = await fetchTokenTopPool(token.address);
    if (!pool) return null;

    const baseId = pool.relationships?.base_token?.data?.id ?? "";
    const quoteId = pool.relationships?.quote_token?.data?.id ?? "";
    const isBase = baseId.toLowerCase().includes(token.address.toLowerCase());
    const isQuote = quoteId.toLowerCase().includes(token.address.toLowerCase());
    const livePrice = isBase || !isQuote ? toNumber(pool.attributes.base_token_price_usd ?? pool.attributes.price_in_usd) : toNumber(pool.attributes.quote_token_price_usd);
    const rawChange = toNumber(pool.attributes.price_change_percentage?.h24);
    const priceChange24hPct = rawChange === null ? null : isBase || !isQuote ? rawChange : -rawChange;
    const volume24hUsd = toNumber(pool.attributes.volume_usd?.h24);
    const { timeframe, aggregate } = intervalToGecko(args.interval);

    const rawCandles = await fetchPoolOHLCV({
      poolId: pool.id,
      timeframe,
      aggregate,
      limit: 120,
    });
    const recentCandles = rawCandles
      .map((c) => ({ t: c[0], o: c[1], h: c[2], l: c[3], c: c[4], v: c[5] }))
      .reverse();

    const closes = recentCandles.map((c) => c.c);
    const last = recentCandles.at(-1);
    const lastCandle = last
      ? {
          open: last.o,
          high: last.h,
          low: last.l,
          close: last.c,
          changePct: last.o ? ((last.c - last.o) / last.o) * 100 : null,
          rangePct: last.o ? ((last.h - last.l) / last.o) * 100 : null,
        }
      : null;

    return {
      requestedSymbol: symbol,
      requestedName: token.name,
      mint: token.address,
      poolId: pool.id,
      interval: args.interval,
      livePrice,
      priceChange24hPct,
      volume24hUsd,
      recentCandles: recentCandles.slice(-64),
      indicatorValues: {
        rsi14: computeRSILast(closes, 14),
        macd: computeMACDLast(closes, 12, 26, 9),
      },
      lastCandle,
      dataSource: "geckoterminal",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      requestedSymbol: symbol,
      requestedName: token.name,
      mint: token.address,
      poolId: "",
      interval: args.interval,
      livePrice: null,
      priceChange24hPct: null,
      volume24hUsd: null,
      recentCandles: [],
      indicatorValues: {},
      lastCandle: null,
      dataSource: "geckoterminal",
      warning: message,
    };
  }
}

function normalizeBaseUrl(value: string | undefined) {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.endsWith("/openai/v1")) return trimmed;
  if (trimmed.endsWith("/openai")) return `${trimmed}/v1`;
  return `${trimmed}/openai/v1`;
}

class AzureRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly upstreamMessage: string,
    readonly requestId: string | null
  ) {
    super(message);
    this.name = "AzureRequestError";
  }
}

function azureHeaders(apiKey: string, bearerToken: string | undefined) {
  return {
    "Content-Type": "application/json",
    ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : { "api-key": apiKey }),
  };
}

function parseAzureError(text: string) {
  try {
    const json = JSON.parse(text) as { error?: { code?: string | number; message?: string } | string };
    if (typeof json.error === "string") return json.error;
    return json.error?.message ?? text;
  } catch {
    return text;
  }
}

function safeErrorSnippet(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 400);
}

async function postAzureJson(args: {
  url: string;
  apiKey: string;
  bearerToken?: string;
  body: unknown;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AZURE_TIMEOUT_MS);

  try {
    const res = await fetch(args.url, {
      method: "POST",
      headers: azureHeaders(args.apiKey, args.bearerToken),
      body: JSON.stringify(args.body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      const requestId = res.headers.get("apim-request-id") ?? res.headers.get("x-ms-request-id");
      const upstreamMessage = safeErrorSnippet(parseAzureError(errorText));
      throw new AzureRequestError(
        `Azure OpenAI request failed (${res.status})${upstreamMessage ? `: ${upstreamMessage}` : ""}`,
        res.status,
        upstreamMessage,
        requestId
      );
    }

    return (await res.json()) as AzureTextResponse;
  } catch (err: unknown) {
    if (err instanceof AzureRequestError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Azure OpenAI request timed out after ${AZURE_TIMEOUT_MS / 1000}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function azureClientErrorMessage(err: AzureRequestError) {
  if (err.status === 401 || err.status === 403) {
    return [
      "Azure OpenAI authentication failed.",
      "Check that AZURE_OPENAI_API_KEY belongs to the same Azure OpenAI resource as AZURE_OPENAI_BASE_URL.",
      "For Azure OpenAI v1, the base URL should look like your Azure endpoint plus /openai/v1.",
    ].join(" ");
  }

  if (err.status === 404) {
    return "Azure OpenAI deployment was not found. Check that AZURE_OPENAI_MODEL matches your deployment name, not just the model family name.";
  }

  return err.upstreamMessage
    ? `Azure OpenAI request failed: ${err.upstreamMessage}`
    : "Azure OpenAI request failed.";
}

function extractText(json: AzureTextResponse) {
  if (typeof json.output_text === "string" && json.output_text.trim()) {
    return json.output_text.trim();
  }

  const outputText = json.output
    ?.flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? part.value ?? "")
    .join("")
    .trim();
  if (outputText) return outputText;

  const choiceText = json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? "";
  return choiceText.trim();
}

function cleanHistory(history: ChatHistoryItem[] | undefined) {
  return (history ?? [])
    .slice(-10)
    .map((item) => ({
      role: item.role === "wisp" ? "assistant" : item.role === "assistant" ? "assistant" : "user",
      content: (item.content ?? "").trim().slice(0, 2_000),
    }))
    .filter((item) => item.content.length > 0);
}

function formatHistory(history: ChatHistoryItem[] | undefined) {
  const cleaned = cleanHistory(history);
  if (cleaned.length === 0) return "No prior messages.";
  return cleaned.map((item) => `${item.role.toUpperCase()}: ${item.content}`).join("\n\n");
}

function dashboardInstructions() {
  return [
    "You are Wisp: a sharp, frank Solana DeFi intelligence copilot.",
    "You help users understand public Solana DeFi yields, wallet holdings when a public address/.sol is provided, protocols, token markets, token risk, perps, liquidation concepts, strategy ideas, and paper-trading workflows.",
    "The normal chat does NOT have connected-user wallet integration yet. If the user asks about 'my portfolio', 'my positions', 'my liquidation', 'my APY', balances, PnL, or exact personal exposure without giving a public wallet address/.sol, say plainly that you cannot answer personally until wallet data is connected.",
    "If LIVE_SOLANA_DEFI_CONTEXT.wallet has a resolvedAddress, you may summarize that public wallet's balances from Helius with Birdeye price enrichment. Label it as public wallet data, not connected-user/private data.",
    "For wallet holding questions, focus on SOL amount, SPL token count, top token amounts, and approximate USD values when prices are available. Do not add NFT/protocol/risk sections unless the user asks for them.",
    "When personal data is missing, still be useful: pivot to public Solana DeFi data, what to check, and a concrete example framework.",
    "Use LIVE_SOLANA_DEFI_CONTEXT when present. Treat DefiLlama yield pools as the source for public APY/TVL and Birdeye snapshots as the source for token price/liquidity/volume.",
    "For token buy/risk questions, use LIVE_SOLANA_DEFI_CONTEXT.tokenRisk. Give **Verdict: Avoid / Watch / Speculative / Cleaner setup**; do not say guaranteed buy. Cover liquidity, holders, authorities, volume, market cap/FDV, and what would invalidate the setup.",
    "For perps questions, use LIVE_SOLANA_DEFI_CONTEXT.perps. Distinguish public market data from personal liquidation risk. Personal liquidation/PnL requires decoded wallet positions.",
    "For protocol positions, use LIVE_SOLANA_DEFI_CONTEXT.protocolPositions. If live positions are present, summarize supplied/borrowed/net values, health, ranges, liquidation metrics, PnL, open orders, or LP liquidity depending on the protocol. For unsupported protocols, be explicit about the exact SDK/decoder/API still needed.",
    "For API/integration questions, answer from protocolPositions.supported: say whether an API key is needed, whether a public endpoint exists, whether a wallet address is enough, and what still requires wallet connection or custom indexing.",
    "Never invent APY, TVL, price, liquidity, wallet balances, positions, transactions, or protocol state. If a fetch warning is present, be specific about which endpoint/field failed; do not imply all live data failed when other fields are present.",
    "For best-yield questions, do not blindly pick the highest APY. Give a practical ranking by risk bucket: lower-risk stablecoin/single-asset, balanced, and high-risk/high-APY.",
    "Use this compact shape for best-yield answers: **Verdict:** 1 line, then **Lower risk:** 2 bullets, **Balanced:** 2 bullets, **High-risk:** 1 bullet, **Avoid/Watch:** 1 line. Each option should fit one line: Protocol - asset - APY - TVL - main risk.",
    "For protocol comparisons, compare: APY/TVL, source of yield, IL/liquidation/smart-contract risk, reward-token dependence, liquidity depth, and when the user should avoid it.",
    "For 'what is X' questions, explain in plain language first, then list why it matters, core risks, and what public metrics to check.",
    "Keep answers concise, concrete, and action-oriented. Prefer short bullets, compact scorecards, and mini tables made from plain text when comparing options.",
    "For rankings, stay complete and tight: max 3 risk buckets, max 2 options per bucket, no nested bullets, and no wide markdown table unless the user explicitly asks for a table.",
    "Never end mid-sentence. If the answer is getting long, drop lower-priority options instead of continuing.",
    "Tone: frank, precise, visual when useful. No hype. No vague 'it depends' without a decision framework.",
    "No guarantees, no financial advice, no claims of certain future price direction.",
    "If attached files are provided, you only know their names and sizes unless file text is explicitly included.",
  ].join("\n");
}

function shouldShowYieldVisual(message: string) {
  return /\b(yield|yields|apy|apr|farm|farms|earn|earning|lend|lending|staking|stablecoin|usdc|best|compare)\b/i.test(message);
}

function shouldShowWalletProtocolExposure(message: string) {
  return /\b(protocol|position|positions|exposure|lend|borrow|lp|liquidity|farm|vault|kamino|marginfi|drift|orca|raydium|meteora|jupiter)\b/i.test(message);
}

function toVisualPool(pool: RankedYieldPool) {
  return {
    protocol: pool.protocol,
    symbol: pool.symbol,
    apy: pool.apy,
    tvlUsd: pool.tvlUsd,
    riskTier: pool.riskTier,
    reason: pool.reason,
  };
}

function buildDashboardVisuals(context: DashboardDeFiContext | null, message: string): DashboardVisual[] {
  if (!context) return [];

  const visuals: DashboardVisual[] = [];
  if (context.wallet?.resolvedAddress) {
    visuals.push({
      kind: "wallet-holdings",
      title: "Public Wallet Holdings",
      source: "Helius/Birdeye",
      address: context.wallet.resolvedAddress,
      label: context.wallet.addressLabel ?? context.wallet.resolvedAddress,
      totalValueUsd: context.wallet.totalValueUsd,
      nativeSol: context.wallet.nativeSol,
      tokenCount: context.wallet.tokenCount,
      tokens: context.wallet.topTokens.slice(0, 8).map((token) => ({
        symbol: token.symbol,
        name: token.name,
        amount: token.amount,
        valueUsd: token.valueUsd,
        priceUsd: token.priceUsd,
      })),
      protocolExposure: shouldShowWalletProtocolExposure(message) ? context.wallet.possibleProtocolExposure : [],
    });
  }

  const yields = context.yields;
  if (yields && !yields.warning && shouldShowYieldVisual(message)) {
    const lower = yields.topStablecoin.slice(0, 2).map(toVisualPool);
    const balanced = (yields.topSolExposure.length ? yields.topSolExposure : yields.topRiskAdjusted)
      .filter((pool) => pool.riskTier !== "high")
      .slice(0, 2)
      .map(toVisualPool);
    const high = yields.topRawApy
      .filter((pool) => pool.riskTier === "high")
      .slice(0, 2)
      .map(toVisualPool);

    visuals.push({
      kind: "yield-ranking",
      title: "Solana Yield Map",
      source: "DefiLlama",
      fetchedAt: yields.fetchedAt,
      buckets: [
        { label: "Lower risk", tone: "green" as const, pools: lower },
        { label: "Balanced", tone: "cyan" as const, pools: balanced },
        { label: "High-risk", tone: "amber" as const, pools: high },
      ].filter((bucket) => bucket.pools.length > 0),
    });
  }

  if (context.tokens.snapshots.length > 0) {
    visuals.push({
      kind: "token-snapshot",
      title: "Solana Token Snapshot",
      source: "Birdeye",
      tokens: context.tokens.snapshots.map((token) => ({
        symbol: token.symbol,
        name: token.name,
        priceUsd: token.priceUsd,
        priceChange24hPct: token.priceChange24hPct,
        volume24hUsd: token.volume24hUsd,
        liquidityUsd: token.liquidityUsd,
        marketCapUsd: token.marketCapUsd,
      })),
    });
  }

  if (context.tokenRisk?.risk) {
    const risk = context.tokenRisk.risk;
    visuals.push({
      kind: "token-risk",
      title: "Token Risk Scorecard",
      source: "Birdeye",
      symbol: risk.symbol,
      name: risk.name,
      mint: risk.mint,
      score: risk.score,
      label: risk.label,
      overview: {
        priceUsd: risk.overview.priceUsd,
        priceChange24hPct: risk.overview.priceChange24hPct,
        volume24hUsd: risk.overview.volume24hUsd,
        liquidityUsd: risk.overview.liquidityUsd,
        marketCapUsd: risk.overview.marketCapUsd,
        fdvUsd: risk.overview.fdvUsd,
        holders: risk.overview.holders,
      },
      checks: risk.checks,
      warnings: risk.warnings,
    });
  }

  if (context.perps) {
    visuals.push({
      kind: "perps-snapshot",
      title: "Perps Market Snapshot",
      source: "Drift/Jupiter/Flash",
      venue: context.perps.requestedVenue,
      market: context.perps.requestedMarket,
      snapshots: context.perps.snapshots.slice(0, 6).map((snapshot) => ({
        venue: snapshot.venue,
        market: snapshot.market,
        priceUsd: snapshot.priceUsd,
        fundingRate: snapshot.fundingRate,
        openInterestUsd: snapshot.openInterestUsd,
        volume24hUsd: snapshot.volume24hUsd,
        longShortSkew: snapshot.longShortSkew,
      })),
      warnings: context.perps.warnings.slice(0, 3),
    });
  }

  if (context.protocolPositions) {
    visuals.push({
      kind: "protocol-positions",
      title: "Protocol Position Coverage",
      source: "Protocol decoders",
      protocols: context.protocolPositions.supported,
      warnings: context.protocolPositions.warnings,
    });
  }

  return visuals;
}

function tradeInstructions(teacherMode: boolean) {
  return [
    "You are Wisp: a frank, funny, very human Solana DEX trading buddy.",
    "Tone: casual, witty, a bit mischievous, but not cringe. Short paragraphs.",
    "You are inside a paper-trading terminal. Users have no funds; they are learning.",
    "You can use the provided screen context to answer what they are seeing: symbol, timeframe, candle type, enabled indicators, last candle OHLC, recent candles, indicator values (RSI/MACD), paper balance, position stats (qty/avg entry/unrealized PnL), open orders, and latest fills.",
    "If REQUESTED_MARKET_CONTEXT is present, use it as the primary source for the requested token even if SCREEN_CONTEXT is showing a different symbol.",
    "If REQUESTED_MARKET_CONTEXT has a warning or empty candles, say the live data fetch failed and fall back to what is available. Do not invent candles, RSI, MACD, volume, or prices.",
    "When you use REQUESTED_MARKET_CONTEXT for another token, briefly say that you fetched fresh market data for that symbol.",
    "For requested-token trade analysis, cover: current price/24h change/volume, latest candle color and OHLC implication, RSI, MACD, 2-3 scenarios, and a simple paper-trade plan sized to the user's amount if provided.",
    "Do NOT claim certainty about price direction. No guarantees. Give probabilistic, educational guidance and risk management.",
    "If the user asks whether to buy, sell, hold, enter, exit, or what to do now, give a clear paper-trading verdict in the first 1-2 lines: **Verdict: Buy / Hold / Wait / Sell / Exit**. Pick one. Do not answer with only vague pros and cons.",
    "After the verdict, explain the 2-3 strongest reasons in simple language, then give exact paper-trade steps: amount/size, entry condition, stop/invalidation, and take-profit or reassessment level. If the data is mixed, use **Verdict: Wait** and say exactly what confirmation would change it to Buy or Sell.",
    "Keep the verdict educational and paper-only. Do not say 'not financial advice' repeatedly; one short risk line is enough.",
    "If the user asks 'where will it go', respond with: (1) what the indicators imply, (2) 2-3 scenarios, (3) a simple plan (entries/exits/invalidations), (4) position sizing guidance for paper.",
    "If the user asks about 'my position', summarize: qty, avg entry, mark price, unrealized PnL, any open orders, and the last 1-3 fills (side/qty/price).",
    "If TEACHER_MODE is true, include a short 'Mini lesson (<=60s)' section at the end: definition, why it matters, and a tiny example using the current SCREEN_CONTEXT. Do not add this section otherwise.",
    "ACTION TOKENS (IMPORTANT):",
    "- If the user asks to open/switch/show a different coin/pair, include EXACTLY one token on its own line at the top: [[SWITCH_SYMBOL:SYMBOL]] (SYMBOL must be a ticker symbol like SOL/JUP/BONK).",
    "- If the user asks for suggestions / strategy / what next / where will it go, include [[SHOW_CHART]] somewhere in the reply so the UI renders a mini chart under your message.",
    "If context is missing, ask 1 targeted question.",
    "",
    `TEACHER_MODE: ${teacherMode ? "true" : "false"}`,
  ].join("\n");
}

function predictionInstructions() {
  return [
    "You are Wisp inside a prediction-market paper terminal.",
    "The user is trading simulated rolling BTC/SOL 5m and 15m binary markets. No real funds, no real order execution.",
    "Market mechanics: YES pays $1 if the asset closes above the window open at expiry. NO pays $1 if it closes below. Draws settle at $0.50.",
    "Use PREDICTION_CONTEXT only. Do not invent odds, prices, PnL, positions, or Polymarket liquidity.",
    "Tone: frank, precise, visual, compact. This is a trading desk helper, not a hype bot.",
    "If the user asks what to do, give a paper-only verdict first: **Verdict: Buy YES / Buy NO / Wait / Reduce / Exit**. Pick one.",
    "Explain the strongest 2-3 reasons: price versus window open, time left, odds/pricing, and position risk.",
    "If odds are too expensive or the window is noisy, say Wait and give the exact trigger that would change your mind.",
    "If the user asks about their paper position, summarize shares, average price, current mark, max payout, breakeven idea, and latest settlement/fill if present.",
    "If Polymarket references exist, treat them only as external context. The active paper markets are Wisp-simulated from Binance realtime prices.",
    "Keep answers short. No markdown tables unless comparing all four markets.",
    "No guarantees. One short risk line is enough.",
    "If context is missing, ask one targeted question.",
  ].join("\n");
}

async function azureGenerate(args: {
  instructions: string;
  input: string;
  maxOutputTokens: number;
}) {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const baseUrl = normalizeBaseUrl(process.env.AZURE_OPENAI_BASE_URL);
  const model = process.env.AZURE_OPENAI_DEPLOYMENT ?? process.env.AZURE_OPENAI_MODEL ?? DEFAULT_MODEL;
  const authMode = process.env.AZURE_OPENAI_AUTH_MODE?.toLowerCase() === "bearer" ? "bearer" : "api-key";
  const bearerToken =
    authMode === "bearer" ? process.env.AZURE_OPENAI_AUTH_TOKEN ?? process.env.AZURE_OPENAI_API_KEY : undefined;

  if (!baseUrl || (authMode === "api-key" && !apiKey) || (authMode === "bearer" && !bearerToken)) {
    throw new Error("Missing AZURE_OPENAI_BASE_URL and Azure OpenAI credentials.");
  }

  const responsesBody = {
    model,
    instructions: args.instructions,
    input: args.input,
    max_output_tokens: args.maxOutputTokens,
  };

  let responsesError: AzureRequestError | null = null;
  try {
    const json = await postAzureJson({
      url: `${baseUrl}/responses`,
      apiKey: apiKey ?? "",
      bearerToken,
      body: responsesBody,
    });
    const text = extractText(json);
    if (text) return text;
    throw new Error("Azure OpenAI returned an empty response.");
  } catch (err: unknown) {
    if (!(err instanceof AzureRequestError)) throw err;
    if (![400, 404, 405].includes(err.status)) throw err;
    responsesError = err;
  }

  // Some Azure deployments are still exposed through Chat Completions only.
  const json = await postAzureJson({
    url: `${baseUrl}/chat/completions`,
    apiKey: apiKey ?? "",
    bearerToken,
    body: {
      model,
      messages: [
        { role: "system", content: args.instructions },
        { role: "user", content: args.input },
      ],
      max_completion_tokens: args.maxOutputTokens,
    },
  });

  const text = extractText(json);
  if (text) return text;
  throw new Error(
    `Azure OpenAI returned an empty response.${responsesError ? ` Responses fallback reason: ${responsesError.message}` : ""}`
  );
}

export async function POST(req: NextRequest) {
  let body: {
    message?: string;
    context?: TradeContext;
    predictionContext?: PredictionContext;
    surface?: "dashboard" | "trade" | "prediction";
    history?: ChatHistoryItem[];
    files?: AttachedFile[];
  } = {};

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Missing message." }, { status: 400 });

  const surface = body.surface ?? "trade";
  const teacherMode = /(^|\b)(what is|what's|whats|what does|define|explain|teach me)\b/i.test(message);
  const requestedSymbol =
    surface === "trade" ? detectRequestedSymbol(message, body.context?.symbol) : null;
  const requestedMarketContext = requestedSymbol
    ? await fetchRequestedMarketContext({
        symbol: requestedSymbol,
        interval: body.context?.interval ?? "15m",
      })
    : null;
  const dashboardDeFiContext =
    surface === "dashboard" ? await buildDashboardDeFiContext({ message }) : null;
  const dashboardVisuals =
    surface === "dashboard" ? buildDashboardVisuals(dashboardDeFiContext, message) : [];

  const instructions =
    surface === "dashboard"
      ? dashboardInstructions()
      : surface === "prediction"
        ? predictionInstructions()
        : tradeInstructions(teacherMode);
  const input =
    surface === "dashboard"
      ? [
          "CONVERSATION_HISTORY:",
          formatHistory(body.history),
          "",
          "ATTACHED_FILES_METADATA(JSON):",
          JSON.stringify(body.files ?? []),
          "",
          "LIVE_SOLANA_DEFI_CONTEXT(JSON):",
          JSON.stringify(dashboardDeFiContext),
          "",
          "USER:",
          message,
        ].join("\n")
      : surface === "prediction"
        ? [
            "PREDICTION_CONTEXT(JSON):",
            JSON.stringify(body.predictionContext ?? {}),
            "",
            "USER:",
            message,
          ].join("\n")
      : [
          "SCREEN_CONTEXT(JSON):",
          JSON.stringify(body.context ?? {}),
          "",
          "REQUESTED_MARKET_CONTEXT(JSON):",
          JSON.stringify(requestedMarketContext ?? null),
          "",
          "USER:",
          message,
        ].join("\n");

  try {
    const text = await azureGenerate({
      instructions,
      input,
      maxOutputTokens: surface === "dashboard" ? 1100 : surface === "prediction" ? 600 : 650,
    });
    return NextResponse.json(
      {
        reply: text,
        requestedMarket: requestedMarketContext
          ? {
              symbol: requestedMarketContext.requestedSymbol,
              name: requestedMarketContext.requestedName,
              interval: requestedMarketContext.interval,
              recentCandles: requestedMarketContext.recentCandles,
            }
          : null,
        visuals: dashboardVisuals,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof AzureRequestError) {
      console.error("Azure OpenAI request failed", {
        status: err.status,
        message: err.upstreamMessage,
        requestId: err.requestId,
      });
      return NextResponse.json({ error: azureClientErrorMessage(err) }, { status: 502 });
    }

    console.error(err);
    return NextResponse.json({ error: "AI request failed." }, { status: 500 });
  }
}
