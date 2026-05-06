"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Candle, MarketMode, Ticker24h } from "./types";

async function apiGet<T>(path: string, params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    sp.set(k, String(v));
  }
  const res = await fetch(`${path}?${sp.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return (await res.json()) as T;
}

export function useMarkets(mode: MarketMode) {
  const [tickers, setTickers] = useState<Ticker24h[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [poolBySymbol, setPoolBySymbol] = useState<Map<string, string>>(new Map());

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await apiGet<{ tickers: (Ticker24h & { poolId: string })[] }>("/api/dex/markets", { mode });
      setTickers(data.tickers);
      setPoolBySymbol(new Map(data.tickers.map((t) => [t.symbol, t.poolId])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickers");
      setTickers(null);
      setPoolBySymbol(new Map());
    }
  }, [mode]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await refresh();
    };

    // Initial + subscription refreshes.
    void tick();
    const t = setInterval(() => { void tick(); }, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [mode, refresh]);

  const bySymbol = useMemo(() => {
    const m = new Map<string, Ticker24h>();
    for (const t of tickers ?? []) m.set(t.symbol, t);
    return m;
  }, [tickers]);

  return { tickers, bySymbol, poolBySymbol, error, refresh };
}

export function useCandles(opts: { poolId: string; interval: string }) {
  const { poolId, interval } = opts;
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!poolId) return;
    setLoading(true);
    try {
      setError(null);
      const data = await apiGet<{ candles: Candle[] }>("/api/dex/ohlcv", { poolId, interval, limit: 400 });
      setCandles(data.candles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load candles");
      setCandles(null);
    } finally {
      setLoading(false);
    }
  }, [poolId, interval]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await refresh();
    };

    void tick();
    const t = setInterval(() => { void tick(); }, 12_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [poolId, interval, refresh]);

  return { candles, error, loading, refresh };
}

