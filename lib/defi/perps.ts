export type PerpsMarketSnapshot = {
  venue: "drift" | "jupiter" | "flash";
  market: string;
  priceUsd: number | null;
  fundingRate: number | null;
  openInterestUsd: number | null;
  volume24hUsd: number | null;
  longShortSkew: number | null;
  source: string;
};

export type PerpsContext = {
  requestedVenue: "drift" | "jupiter" | "flash" | "general";
  requestedMarket: string | null;
  snapshots: PerpsMarketSnapshot[];
  notes: string[];
  warnings: string[];
};

type JsonRecord = Record<string, unknown>;

const PERPS_RE = /\b(perp|perps|perpetual|funding|open interest|oi|longs?|shorts?|liquidation|leverage|basis|mark price|index price)\b/i;
const DRIFT_BASE = "https://data.api.drift.trade";
const DRIFT_FALLBACK_BASES = ["https://mainnet-beta.api.drift.trade", DRIFT_BASE];

function toNumber(value: unknown) {
  const number = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function firstNumber(source: JsonRecord | undefined, keys: string[]) {
  if (!source) return null;
  for (const key of keys) {
    const value = toNumber(source[key]);
    if (value !== null) return value;
  }
  return null;
}

function detectVenue(message: string): PerpsContext["requestedVenue"] {
  if (/\bdrift\b/i.test(message)) return "drift";
  if (/\bjupiter|jup\b/i.test(message)) return "jupiter";
  if (/\bflash\b/i.test(message)) return "flash";
  return "general";
}

function detectMarket(message: string) {
  const match = /\b(SOL|BTC|ETH|JUP|WIF|BONK|PYTH|JTO|KMNO|RAY|ORCA)\b/i.exec(message);
  return match?.[1]?.toUpperCase() ?? null;
}

function apiHeaders(apiKey: string | undefined | null) {
  const key = apiKey?.trim();
  return {
    Accept: "application/json",
    ...(key ? { "X-API-KEY": key, Authorization: `Bearer ${key}` } : {}),
  };
}

async function fetchJson(url: string, apiKey?: string | null) {
  const res = await fetch(url, { headers: apiHeaders(apiKey), next: { revalidate: 30 } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${url} failed (${res.status})${text ? `: ${text.slice(0, 120)}` : ""}`);
  }
  return (await res.json()) as unknown;
}

function asRecords(json: unknown): JsonRecord[] {
  if (Array.isArray(json)) return json.filter((item): item is JsonRecord => typeof item === "object" && item !== null);
  if (typeof json !== "object" || json === null) return [];
  const record = json as JsonRecord;
  const candidates = [record.data, record.result, record.markets, record.perpMarkets, record.records];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is JsonRecord => typeof item === "object" && item !== null);
    }
  }
  return [];
}

function marketName(record: JsonRecord) {
  const value = record.marketName ?? record.symbol ?? record.name ?? record.ticker ?? record.market;
  return typeof value === "string" ? value.toUpperCase() : "";
}

function driftMarketSymbol(market: string | null) {
  const base = (market ?? "SOL").toUpperCase().replace(/-?PERP$/, "");
  return `${base}-PERP`;
}

async function fetchDriftFundingSnapshot(base: string, market: string | null, apiKey: string | null) {
  const symbol = driftMarketSymbol(market);
  const records = asRecords(await fetchJson(`${base}/market/${encodeURIComponent(symbol)}/fundingRates`, apiKey));
  const latest = records[0];
  if (!latest) return null;

  return {
    venue: "drift" as const,
    market: marketName(latest) || symbol,
    priceUsd: firstNumber(latest, ["oraclePriceTwap", "markPriceTwap", "oraclePrice", "markPrice", "price"]),
    fundingRate: firstNumber(latest, ["fundingRate", "fundingRateLong", "lastFundingRate", "hourlyFundingRate"]),
    openInterestUsd: firstNumber(latest, ["openInterest", "openInterestUsd", "openInterestUSD", "oi"]),
    volume24hUsd: firstNumber(latest, ["volume24h", "volume24hUsd", "volume24hUSD"]),
    longShortSkew: firstNumber(latest, ["longShortSkew", "skew", "baseAssetAmountWithAmm"]),
    source: `${base}/market/${symbol}/fundingRates`,
  };
}

async function fetchDriftSnapshot(market: string | null): Promise<{ snapshots: PerpsMarketSnapshot[]; warnings: string[] }> {
  const configuredBase = process.env.DRIFT_DATA_API_BASE_URL?.trim();
  const bases = configuredBase ? [configuredBase] : DRIFT_FALLBACK_BASES;
  const apiKey = process.env.DRIFT_DATA_API_KEY ?? null;
  const warnings: string[] = [];

  for (const rawBase of bases) {
    const base = rawBase.replace(/\/+$/, "");
    try {
      const snapshot = await fetchDriftFundingSnapshot(base, market, apiKey);
      if (snapshot) return { snapshots: [snapshot], warnings };
    } catch (err: unknown) {
      warnings.push(err instanceof Error ? err.message : String(err));
    }
  }

  const urls = bases.flatMap((rawBase) => {
    const base = rawBase.replace(/\/+$/, "");
    return [
      `${base}/markets`,
      `${base}/perpMarkets`,
      `${base}/perp-markets`,
    ];
  });

  for (const url of urls) {
    try {
      const records = asRecords(await fetchJson(url, apiKey));
      if (records.length === 0) continue;
      const filtered = market
        ? records.filter((record) => marketName(record).includes(market))
        : records;
      const sourceRecords = (filtered.length ? filtered : records).slice(0, 6);

      return {
        snapshots: sourceRecords.map((record) => ({
          venue: "drift",
          market: marketName(record) || market || "PERP",
          priceUsd: firstNumber(record, ["oraclePrice", "indexPrice", "markPrice", "price", "lastPrice"]),
          fundingRate: firstNumber(record, ["fundingRate", "fundingRateLong", "lastFundingRate", "hourlyFundingRate"]),
          openInterestUsd: firstNumber(record, ["openInterest", "openInterestUsd", "openInterestUSD", "oi"]),
          volume24hUsd: firstNumber(record, ["volume24h", "volume24hUsd", "volume24hUSD"]),
          longShortSkew: firstNumber(record, ["longShortSkew", "skew", "baseAssetAmountWithAmm"]),
          source: url,
        })),
        warnings,
      };
    } catch (err: unknown) {
      warnings.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { snapshots: [], warnings };
}

async function fetchConfiguredVenueSnapshot(args: {
  venue: "jupiter" | "flash";
  market: string | null;
  baseUrl: string | undefined;
  apiKey: string | undefined;
}): Promise<{ snapshots: PerpsMarketSnapshot[]; warnings: string[] }> {
  const base = args.baseUrl?.trim().replace(/\/+$/, "");
  if (!base) return { snapshots: [], warnings: [] };

  const warnings: string[] = [];
  const urls = [
    `${base}/markets`,
    `${base}/perpMarkets`,
    `${base}/perp-markets`,
    `${base}/perps/markets`,
  ];

  for (const url of urls) {
    try {
      const records = asRecords(await fetchJson(url, args.apiKey));
      if (records.length === 0) continue;
      const filtered = args.market
        ? records.filter((record) => marketName(record).includes(args.market ?? ""))
        : records;
      const sourceRecords = (filtered.length ? filtered : records).slice(0, 6);

      return {
        snapshots: sourceRecords.map((record) => ({
          venue: args.venue,
          market: marketName(record) || args.market || "PERP",
          priceUsd: firstNumber(record, ["oraclePrice", "indexPrice", "markPrice", "price", "lastPrice"]),
          fundingRate: firstNumber(record, ["fundingRate", "fundingRateLong", "lastFundingRate", "hourlyFundingRate"]),
          openInterestUsd: firstNumber(record, ["openInterest", "openInterestUsd", "openInterestUSD", "oi"]),
          volume24hUsd: firstNumber(record, ["volume24h", "volume24hUsd", "volume24hUSD"]),
          longShortSkew: firstNumber(record, ["longShortSkew", "skew"]),
          source: url,
        })),
        warnings,
      };
    } catch (err: unknown) {
      warnings.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { snapshots: [], warnings };
}

export function shouldFetchPerpsContext(message: string) {
  return PERPS_RE.test(message);
}

export async function fetchPerpsContext(message: string): Promise<PerpsContext | null> {
  if (!shouldFetchPerpsContext(message)) return null;

  const requestedVenue = detectVenue(message);
  const requestedMarket = detectMarket(message);
  const notes = [
    "Perps answers should distinguish market-level public data from wallet-specific liquidation risk.",
    "Personal liquidation/PnL needs the user's Drift/Jupiter/Flash account positions decoded from wallet data.",
  ];

  if (requestedVenue === "jupiter") {
    return {
      requestedVenue,
      requestedMarket,
      snapshots: [],
      notes,
      warnings: [
        "Jupiter Perps is intentionally disabled for now because exact live/user position support needs a stable indexed source or custom account indexer.",
      ],
    };
  }

  if (requestedVenue === "flash") {
    const flash = await fetchConfiguredVenueSnapshot({
      venue: "flash",
      market: requestedMarket,
      baseUrl: process.env.FLASH_PERPS_API_BASE_URL,
      apiKey: process.env.FLASH_PERPS_API_KEY,
    });

    return {
      requestedVenue,
      requestedMarket,
      snapshots: flash.snapshots,
      notes,
      warnings: flash.snapshots.length
        ? flash.warnings.slice(0, 2)
        : [
            "Flash perps live endpoint is not configured. Set FLASH_PERPS_API_BASE_URL or wire the Flash SDK for live REST/WebSocket market data.",
            ...flash.warnings.slice(0, 2),
          ],
    };
  }

  const drift = await fetchDriftSnapshot(requestedMarket);
  return {
    requestedVenue: requestedVenue === "general" ? "drift" : requestedVenue,
    requestedMarket,
    snapshots: drift.snapshots,
    notes,
    warnings: drift.snapshots.length
      ? drift.warnings.slice(0, 2)
      : [
          "Drift market endpoint did not return a parseable snapshot. Configure DRIFT_DATA_API_BASE_URL/DRIFT_DATA_API_KEY if your deployment uses gated Drift Data API access.",
          ...drift.warnings.slice(0, 2),
        ],
  };
}
