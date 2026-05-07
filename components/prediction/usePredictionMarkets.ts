"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Candle } from "@/components/trade/types";
import type {
  PredictionMarket,
  PredictionMarketConfig,
  PredictionWsStatus,
} from "@/components/prediction/types";

const FUTURES_WS = "wss://fstream.binance.com/stream";
const STALE_AFTER_MS = 8_000;
const WINDOW_OPEN_KEY_PREFIX = "wisp_prediction_window_open_v1";

export const PREDICTION_MARKETS: PredictionMarketConfig[] = [
  { key: "btc-5m", asset: "BTC", symbol: "BTCUSDT", durationMinutes: 5, label: "BTC 5m" },
  { key: "btc-15m", asset: "BTC", symbol: "BTCUSDT", durationMinutes: 15, label: "BTC 15m" },
  { key: "sol-5m", asset: "SOL", symbol: "SOLUSDT", durationMinutes: 5, label: "SOL 5m" },
  { key: "sol-15m", asset: "SOL", symbol: "SOLUSDT", durationMinutes: 15, label: "SOL 15m" },
];

type RawTick = {
  price: number;
  previousPrice: number | null;
  atMs: number;
};

type WindowOpen = {
  price: number;
  atMs: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function bucketStart(nowMs: number, durationMinutes: number) {
  const durationMs = durationMinutes * 60_000;
  return Math.floor(nowMs / durationMs) * durationMs;
}

function question(asset: string, durationMinutes: number, startTimeMs: number) {
  const time = new Date(startTimeMs + durationMinutes * 60_000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${asset} above its window open at ${time}?`;
}

function candleFromKline(raw: unknown): Candle | null {
  if (!Array.isArray(raw) || raw.length < 6) return null;
  const time = Math.floor(Number(raw[0]) / 1000);
  const open = Number(raw[1]);
  const high = Number(raw[2]);
  const low = Number(raw[3]);
  const close = Number(raw[4]);
  const volume = Number(raw[5]);
  if (![time, open, high, low, close, volume].every(Number.isFinite)) return null;
  return { time, open, high, low, close, volume };
}

function upsertLiveCandle(candles: Candle[], price: number, atMs: number, volume = 0) {
  const time = Math.floor(atMs / 60_000) * 60;
  const next = candles.slice(-420);
  const last = next[next.length - 1];
  if (last && last.time === time) {
    next[next.length - 1] = {
      ...last,
      high: Math.max(last.high, price),
      low: Math.min(last.low, price),
      close: price,
      volume: last.volume + volume,
    };
    return next;
  }
  next.push({ time, open: price, high: price, low: price, close: price, volume });
  return next.slice(-420);
}

function realizedVolatility(candles: Candle[], lookback = 45) {
  const closes = candles.slice(-lookback).map((c) => c.close).filter((value) => Number.isFinite(value) && value > 0);
  if (closes.length < 8) return 0.0025;
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return clamp(Math.sqrt(variance), 0.0006, 0.015);
}

function computeYesPrice(args: {
  startPrice: number | null;
  livePrice: number | null;
  candles: Candle[];
  durationMinutes: number;
  timeRemainingMs: number;
}) {
  const { startPrice, livePrice, candles, durationMinutes, timeRemainingMs } = args;
  if (!startPrice || !livePrice || startPrice <= 0 || livePrice <= 0) return 0.5;

  const change = (livePrice - startPrice) / startPrice;
  const oneMinuteVol = realizedVolatility(candles);
  const remainingRatio = clamp(timeRemainingMs / (durationMinutes * 60_000), 0.08, 1);
  const expectedMove = Math.max(oneMinuteVol * Math.sqrt(Math.max(durationMinutes * remainingRatio, 0.35)), 0.00045);
  const z = clamp(change / expectedMove, -5, 5);
  const lateBoost = 1 + (1 - remainingRatio) * 0.65;
  return clamp(sigmoid(z * lateBoost), 0.03, 0.97);
}

function readWindowOpens() {
  if (typeof window === "undefined") return new Map<string, WindowOpen>();
  try {
    const raw = window.localStorage.getItem(WINDOW_OPEN_KEY_PREFIX);
    const parsed = raw ? (JSON.parse(raw) as Record<string, WindowOpen>) : {};
    return new Map(Object.entries(parsed));
  } catch {
    return new Map<string, WindowOpen>();
  }
}

function writeWindowOpens(opens: Map<string, WindowOpen>) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const compact = [...opens.entries()]
    .filter(([, value]) => now - value.atMs < 90 * 60_000)
    .reduce<Record<string, WindowOpen>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  window.localStorage.setItem(WINDOW_OPEN_KEY_PREFIX, JSON.stringify(compact));
}

export function usePredictionMarkets() {
  const [candlesBySymbol, setCandlesBySymbol] = useState<Record<string, Candle[]>>({});
  const [ticksBySymbol, setTicksBySymbol] = useState<Record<string, RawTick>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<PredictionWsStatus>("connecting");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [openVersion, setOpenVersion] = useState(0);
  const windowOpensRef = useRef<Map<string, WindowOpen>>(readWindowOpens());

  const refreshHistory = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const symbols = [...new Set(PREDICTION_MARKETS.map((market) => market.symbol))];
      const entries = await Promise.all(
        symbols.map(async (symbol) => {
          const params = new URLSearchParams({ mode: "perps", symbol, interval: "1m", limit: "420" });
          const res = await fetch(`/api/market/klines?${params.toString()}`, { cache: "no-store" });
          if (!res.ok) throw new Error(`${symbol} history failed (${res.status})`);
          const json = (await res.json()) as { candles?: Candle[] };
          return [symbol, json.candles ?? []] as const;
        })
      );
      setCandlesBySymbol(Object.fromEntries(entries));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Binance history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let changed = false;
    for (const config of PREDICTION_MARKETS) {
      const startTimeMs = bucketStart(nowMs, config.durationMinutes);
      const windowKey = `${config.symbol}-${config.durationMinutes}-${startTimeMs}`;
      if (windowOpensRef.current.has(windowKey)) continue;

      const candles = candlesBySymbol[config.symbol] ?? [];
      const candleOpen = candles.find((candle) => candle.time * 1000 === startTimeMs)?.open ?? null;
      const tickPrice = ticksBySymbol[config.symbol]?.price ?? null;
      const lastClose = candles[candles.length - 1]?.close ?? null;
      const openPrice = candleOpen ?? tickPrice ?? lastClose;
      if (!openPrice || !Number.isFinite(openPrice) || openPrice <= 0) continue;

      windowOpensRef.current.set(windowKey, { price: openPrice, atMs: startTimeMs });
      changed = true;
    }

    if (changed) {
      writeWindowOpens(windowOpensRef.current);
      setOpenVersion((value) => value + 1);
    }
  }, [candlesBySymbol, nowMs, ticksBySymbol]);

  useEffect(() => {
    let closed = false;
    let retry: number | null = null;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (closed) return;
      setWsStatus("connecting");
      const streams = [...new Set(PREDICTION_MARKETS.map((market) => market.symbol.toLowerCase()))]
        .flatMap((symbol) => [`${symbol}@trade`, `${symbol}@kline_1m`])
        .join("/");

      socket = new WebSocket(`${FUTURES_WS}?streams=${streams}`);

      socket.onopen = () => {
        if (!closed) setWsStatus("live");
      };

      socket.onmessage = (event) => {
        if (closed) return;
        try {
          const payload = JSON.parse(String(event.data)) as { stream?: string; data?: any };
          const stream = payload.stream ?? "";
          const data = payload.data;
          if (!data) return;

          if (stream.endsWith("@trade")) {
            const symbol = String(data.s ?? "").toUpperCase();
            const price = Number(data.p);
            const atMs = Number(data.T ?? data.E ?? Date.now());
            if (!symbol || !Number.isFinite(price) || price <= 0) return;
            setTicksBySymbol((prev) => ({
              ...prev,
              [symbol]: {
                price,
                previousPrice: prev[symbol]?.price ?? null,
                atMs: Number.isFinite(atMs) ? atMs : Date.now(),
              },
            }));
            setCandlesBySymbol((prev) => ({
              ...prev,
              [symbol]: upsertLiveCandle(prev[symbol] ?? [], price, Number.isFinite(atMs) ? atMs : Date.now()),
            }));
            setWsStatus("live");
            return;
          }

          if (stream.endsWith("@kline_1m") && data.k) {
            const symbol = String(data.s ?? "").toUpperCase();
            const candle = candleFromKline([data.k.t, data.k.o, data.k.h, data.k.l, data.k.c, data.k.v]);
            if (!symbol || !candle) return;
            setCandlesBySymbol((prev) => {
              const next = [...(prev[symbol] ?? [])].filter((item) => item.time !== candle.time);
              next.push(candle);
              next.sort((a, b) => a.time - b.time);
              return { ...prev, [symbol]: next.slice(-420) };
            });
          }
        } catch {
          setWsStatus("error");
        }
      };

      socket.onerror = () => {
        if (!closed) setWsStatus("error");
      };

      socket.onclose = () => {
        if (closed) return;
        setWsStatus("stale");
        retry = window.setTimeout(connect, 1_200);
      };
    };

    connect();
    return () => {
      closed = true;
      if (retry) window.clearTimeout(retry);
      socket?.close();
    };
  }, []);

  const markets = useMemo<PredictionMarket[]>(() => {
    const nextMarkets = PREDICTION_MARKETS.map((config) => {
      const durationMs = config.durationMinutes * 60_000;
      const startTimeMs = bucketStart(nowMs, config.durationMinutes);
      const endTimeMs = startTimeMs + durationMs;
      const contractId = `${config.key}-${startTimeMs}`;
      const candles = candlesBySymbol[config.symbol] ?? [];
      const liveTick = ticksBySymbol[config.symbol];
      const lastCandle = candles[candles.length - 1];
      const livePrice = liveTick?.price ?? lastCandle?.close ?? null;
      const previousPrice = liveTick?.previousPrice ?? (candles.length > 1 ? candles[candles.length - 2].close : null);
      const windowKey = `${config.symbol}-${config.durationMinutes}-${startTimeMs}`;
      const candleOpen = candles.find((candle) => candle.time * 1000 === startTimeMs)?.open ?? null;
      const storedOpen = windowOpensRef.current.get(windowKey)?.price ?? null;
      const startPrice = candleOpen ?? storedOpen ?? livePrice;

      const timeRemainingMs = Math.max(0, endTimeMs - nowMs);
      const yesProbability = computeYesPrice({
        startPrice,
        livePrice,
        candles,
        durationMinutes: config.durationMinutes,
        timeRemainingMs,
      });
      const age = liveTick?.atMs ? nowMs - liveTick.atMs : Infinity;
      const marketStatus: PredictionWsStatus =
        wsStatus === "live" && age < STALE_AFTER_MS ? "live" : wsStatus === "error" ? "error" : age < STALE_AFTER_MS ? "live" : "stale";
      const changePct =
        startPrice && livePrice && startPrice > 0 ? ((livePrice - startPrice) / startPrice) * 100 : null;
      const displayCandles = candles.filter((candle) => candle.time * 1000 >= startTimeMs - 90 * 60_000);

      return {
        ...config,
        contractId,
        question: question(config.asset, config.durationMinutes, startTimeMs),
        startTimeMs,
        endTimeMs,
        startPrice,
        livePrice,
        previousPrice,
        yesPrice: Number(yesProbability.toFixed(3)),
        noPrice: Number((1 - yesProbability).toFixed(3)),
        yesProbability,
        changePct,
        distanceUsd: startPrice && livePrice ? livePrice - startPrice : null,
        timeRemainingMs,
        progressPct: clamp(((nowMs - startTimeMs) / durationMs) * 100, 0, 100),
        candles: displayCandles,
        wsStatus: marketStatus,
        lastTradeAtMs: liveTick?.atMs ?? null,
      };
    });

    return nextMarkets;
  }, [candlesBySymbol, nowMs, openVersion, ticksBySymbol, wsStatus]);

  return {
    markets,
    loading,
    error,
    wsStatus,
    nowMs,
    refreshHistory,
  };
}
