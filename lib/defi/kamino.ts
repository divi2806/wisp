type JsonRecord = Record<string, unknown>;

export type KaminoPositionLeg = {
  side: "deposit" | "borrow";
  reserve: string;
  symbol: string;
  mint: string | null;
  valueUsd: number | null;
  apy: number | null;
};

export type KaminoObligationPosition = {
  protocol: "Kamino";
  market: string;
  marketPubkey: string;
  obligationAddress: string;
  suppliedUsd: number | null;
  borrowedUsd: number | null;
  netUsd: number | null;
  deposits: KaminoPositionLeg[];
  borrows: KaminoPositionLeg[];
  health: "no-borrow" | "lower-risk" | "watch" | "danger" | "unknown";
};

export type KaminoPublicPositionContext = {
  provider: "kamino-api";
  walletAddress: string;
  marketsChecked: number;
  reservesKnown: number;
  positions: KaminoObligationPosition[];
  warnings: string[];
};

type KaminoMarket = {
  name: string;
  lendingMarket: string;
  isPrimary?: boolean;
};

type KaminoReserveMetric = {
  reserve: string;
  liquidityToken: string;
  liquidityTokenMint: string | null;
  supplyApy: number | null;
  borrowApy: number | null;
};

const KAMINO_API_BASE_URL = "https://api.kamino.finance";
const NULL_RESERVE = "11111111111111111111111111111111";
const SCALE_FACTOR = 1_000_000_000_000_000_000;

function toNumber(value: unknown) {
  const number = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? value as JsonRecord : {};
}

function asRecords(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is JsonRecord => typeof item === "object" && item !== null);
}

function scaledUsd(value: unknown) {
  const number = toNumber(value);
  if (number === null) return null;
  return number / SCALE_FACTOR;
}

async function fetchKaminoJson(path: string, query: Record<string, string> = {}) {
  const base = (process.env.KAMINO_API_BASE_URL?.trim() || KAMINO_API_BASE_URL).replace(/\/+$/, "");
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 45 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Kamino ${path} failed (${res.status})${text ? `: ${text.slice(0, 140)}` : ""}`);
  }

  return await res.json() as unknown;
}

function parseMarkets(json: unknown): KaminoMarket[] {
  return asRecords(json)
    .map((item) => ({
      name: toStringValue(item.name, "Kamino Market"),
      lendingMarket: toStringValue(item.lendingMarket),
      isPrimary: item.isPrimary === true,
    }))
    .filter((market) => market.lendingMarket);
}

function parseReserveMetrics(json: unknown) {
  const map = new Map<string, KaminoReserveMetric>();
  for (const item of asRecords(json)) {
    const reserve = toStringValue(item.reserve);
    if (!reserve) continue;
    map.set(reserve, {
      reserve,
      liquidityToken: toStringValue(item.liquidityToken, reserve.slice(0, 4)),
      liquidityTokenMint: toStringValue(item.liquidityTokenMint) || null,
      supplyApy: toNumber(item.supplyApy),
      borrowApy: toNumber(item.borrowApy),
    });
  }
  return map;
}

function parseLeg(
  item: JsonRecord,
  side: "deposit" | "borrow",
  reserves: Map<string, KaminoReserveMetric>
): KaminoPositionLeg | null {
  const reserveKey = side === "deposit" ? "depositReserve" : "borrowReserve";
  const reserve = toStringValue(item[reserveKey]);
  if (!reserve || reserve === NULL_RESERVE) return null;

  const metric = reserves.get(reserve);
  const valueUsd = scaledUsd(item.marketValueSf);
  const rawAmount = side === "deposit" ? toNumber(item.depositedAmount) : toNumber(item.borrowedAmountSf);
  if ((valueUsd ?? 0) <= 0 && (rawAmount ?? 0) <= 0) return null;

  return {
    side,
    reserve,
    symbol: metric?.liquidityToken ?? reserve.slice(0, 4),
    mint: metric?.liquidityTokenMint ?? null,
    valueUsd,
    apy: side === "deposit" ? metric?.supplyApy ?? null : metric?.borrowApy ?? null,
  };
}

function sumUsd(legs: KaminoPositionLeg[]) {
  const known = legs.filter((leg) => leg.valueUsd !== null);
  if (known.length === 0) return null;
  return known.reduce((sum, leg) => sum + (leg.valueUsd ?? 0), 0);
}

function healthFor(suppliedUsd: number | null, borrowedUsd: number | null): KaminoObligationPosition["health"] {
  if (suppliedUsd === null || borrowedUsd === null) return "unknown";
  if (borrowedUsd <= 0) return "no-borrow";
  if (suppliedUsd <= 0) return "danger";
  const ltv = borrowedUsd / suppliedUsd;
  if (ltv >= 0.75) return "danger";
  if (ltv >= 0.55) return "watch";
  return "lower-risk";
}

function parseObligation(args: {
  item: JsonRecord;
  market: KaminoMarket;
  reserves: Map<string, KaminoReserveMetric>;
}): KaminoObligationPosition | null {
  const state = asRecord(args.item.state);
  const obligationAddress = toStringValue(args.item.obligationAddress);
  const deposits = asRecords(state.deposits)
    .map((deposit) => parseLeg(deposit, "deposit", args.reserves))
    .filter((leg): leg is KaminoPositionLeg => Boolean(leg));
  const borrows = asRecords(state.borrows)
    .map((borrow) => parseLeg(borrow, "borrow", args.reserves))
    .filter((leg): leg is KaminoPositionLeg => Boolean(leg));

  if (!obligationAddress || (deposits.length === 0 && borrows.length === 0)) return null;

  const suppliedUsd = sumUsd(deposits);
  const borrowedUsd = sumUsd(borrows);
  const netUsd =
    suppliedUsd === null && borrowedUsd === null
      ? null
      : (suppliedUsd ?? 0) - (borrowedUsd ?? 0);

  return {
    protocol: "Kamino",
    market: args.market.name,
    marketPubkey: args.market.lendingMarket,
    obligationAddress,
    suppliedUsd,
    borrowedUsd,
    netUsd,
    deposits,
    borrows,
    health: healthFor(suppliedUsd, borrowedUsd),
  };
}

async function fetchMarketPositions(args: {
  walletAddress: string;
  market: KaminoMarket;
}) {
  const [obligationsJson, reservesJson] = await Promise.all([
    fetchKaminoJson(`/kamino-market/${args.market.lendingMarket}/users/${args.walletAddress}/obligations`, {
      env: "mainnet-beta",
    }),
    fetchKaminoJson(`/kamino-market/${args.market.lendingMarket}/reserves/metrics`, {
      env: "mainnet-beta",
    }),
  ]);

  const reserves = parseReserveMetrics(reservesJson);
  const positions = asRecords(obligationsJson)
    .map((item) => parseObligation({ item, market: args.market, reserves }))
    .filter((position): position is KaminoObligationPosition => Boolean(position));

  return {
    positions,
    reservesKnown: reserves.size,
  };
}

export async function fetchKaminoPublicPositions(walletAddress: string): Promise<KaminoPublicPositionContext> {
  const warnings: string[] = [];

  try {
    const markets = parseMarkets(await fetchKaminoJson("/v2/kamino-market"));
    const orderedMarkets = [...markets]
      .sort((a, b) => Number(b.isPrimary === true) - Number(a.isPrimary === true))
      .slice(0, 12);

    const results = await Promise.allSettled(
      orderedMarkets.map((market) => fetchMarketPositions({ walletAddress, market }))
    );

    const positions: KaminoObligationPosition[] = [];
    let reservesKnown = 0;
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        positions.push(...result.value.positions);
        reservesKnown += result.value.reservesKnown;
      } else {
        const market = orderedMarkets[index];
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        warnings.push(`${market?.name ?? "Kamino market"} unavailable: ${message}`);
      }
    });

    return {
      provider: "kamino-api",
      walletAddress,
      marketsChecked: orderedMarkets.length,
      reservesKnown,
      positions: positions.sort((a, b) => (b.netUsd ?? 0) - (a.netUsd ?? 0)).slice(0, 12),
      warnings,
    };
  } catch (err: unknown) {
    return {
      provider: "kamino-api",
      walletAddress,
      marketsChecked: 0,
      reservesKnown: 0,
      positions: [],
      warnings: [err instanceof Error ? err.message : String(err)],
    };
  }
}
