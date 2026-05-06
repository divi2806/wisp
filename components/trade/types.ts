export type MarketMode = "spot" | "perps";

export type Ticker24h = {
  symbol: string;
  name: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
};

export type Candle = {
  time: number; // seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

