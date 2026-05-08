export type MarketMode = "spot" | "perps";

export type BinanceMarket = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
};

function baseUrl(mode: MarketMode) {
  return mode === "perps" ? "https://fapi.binance.com" : "https://api.binance.com";
}

export async function fetchBinanceExchangeInfo(mode: MarketMode) {
  const res = await fetch(`${baseUrl(mode)}/${mode === "perps" ? "fapi" : "api"}/v1/exchangeInfo`, {
    next: { revalidate: 60 }, // fast-changing list, but not per-request
  });
  if (!res.ok) throw new Error(`Binance exchangeInfo failed (${res.status})`);
  return (await res.json()) as {
    symbols: Array<{
      symbol: string;
      status: string;
      baseAsset: string;
      quoteAsset: string;
      pricePrecision: number;
      quantityPrecision: number;
      contractType?: string;
    }>;
  };
}

export async function fetchBinance24h(mode: MarketMode, symbol: string) {
  const res = await fetch(
    `${baseUrl(mode)}/${mode === "perps" ? "fapi" : "api"}/v1/ticker/24hr?symbol=${encodeURIComponent(symbol)}`,
    { next: { revalidate: 2 } }
  );
  if (!res.ok) throw new Error(`Binance ticker failed (${res.status})`);
  return (await res.json()) as {
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
  };
}

export async function fetchBinance24hAll(mode: MarketMode) {
  const res = await fetch(`${baseUrl(mode)}/${mode === "perps" ? "fapi" : "api"}/v1/ticker/24hr`, {
    next: { revalidate: 2 },
  });
  if (!res.ok) throw new Error(`Binance tickers failed (${res.status})`);
  return (await res.json()) as Array<{
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
  }>;
}

export async function fetchBinanceKlines(opts: {
  mode: MarketMode;
  symbol: string;
  interval: string;
  limit?: number;
}) {
  const { mode, symbol, interval, limit = 500 } = opts;

  const res = await fetch(
    `${baseUrl(mode)}/${mode === "perps" ? "fapi" : "api"}/v1/klines?symbol=${encodeURIComponent(
      symbol
    )}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
    {
      next: { revalidate: 2 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WispBot/1.0)",
        "Accept": "application/json",
      },
    }
  );
  if (!res.ok) throw new Error(`Binance klines failed (${res.status} ${res.statusText})`);
  return (await res.json()) as Array<
    [
      number, // openTime
      string, // open
      string, // high
      string, // low
      string, // close
      string, // volume
      number, // closeTime
      string, // quoteVolume
      number, // trades
      string, // takerBuyBase
      string, // takerBuyQuote
      string // ignore
    ]
  >;
}

