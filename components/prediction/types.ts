import type { Candle } from "@/components/trade/types";

export type PredictionAsset = "BTC" | "SOL";
export type PredictionDuration = 5 | 15;
export type PredictionSide = "yes" | "no";
export type PredictionAction = "buy" | "sell";
export type PredictionOutcome = PredictionSide | "draw";
export type PredictionWsStatus = "connecting" | "live" | "stale" | "error";

export type PredictionMarketConfig = {
  key: string;
  asset: PredictionAsset;
  symbol: "BTCUSDT" | "SOLUSDT";
  durationMinutes: PredictionDuration;
  label: string;
};

export type PredictionMarket = PredictionMarketConfig & {
  contractId: string;
  question: string;
  startTimeMs: number;
  endTimeMs: number;
  startPrice: number | null;
  livePrice: number | null;
  previousPrice: number | null;
  yesPrice: number;
  noPrice: number;
  yesProbability: number;
  changePct: number | null;
  distanceUsd: number | null;
  timeRemainingMs: number;
  progressPct: number;
  candles: Candle[];
  wsStatus: PredictionWsStatus;
  lastTradeAtMs: number | null;
};

export type PredictionPosition = {
  id: string;
  contractId: string;
  marketKey: string;
  asset: PredictionAsset;
  symbol: string;
  durationMinutes: PredictionDuration;
  question: string;
  side: PredictionSide;
  shares: number;
  avgPrice: number;
  openedAtMs: number;
  startTimeMs: number;
  endTimeMs: number;
  startPrice: number;
};

export type PredictionFill = {
  id: string;
  atMs: number;
  contractId: string;
  marketKey: string;
  asset: PredictionAsset;
  durationMinutes: PredictionDuration;
  question: string;
  side: PredictionSide;
  action: PredictionAction;
  shares: number;
  price: number;
  notional: number;
};

export type PredictionSettlement = {
  id: string;
  atMs: number;
  contractId: string;
  marketKey: string;
  asset: PredictionAsset;
  durationMinutes: PredictionDuration;
  question: string;
  side: PredictionSide;
  shares: number;
  avgPrice: number;
  startPrice: number;
  finalPrice: number;
  outcome: PredictionOutcome;
  payout: number;
  pnl: number;
};

export type PredictionPaperState = {
  cashUSDC: number;
  positions: PredictionPosition[];
  fills: PredictionFill[];
  settlements: PredictionSettlement[];
};

export type PolymarketReference = {
  id: string;
  question: string;
  slug: string;
  endDate: string | null;
  liquidity: number | null;
  volume: number | null;
  outcomes: string[];
  outcomePrices: number[];
};
