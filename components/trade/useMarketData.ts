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

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await apiGet<{ tickers: Ticker24h[] }>("/api/dex/markets", { mode });
      setTickers(data.tickers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickers");
      setTickers(null);
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

  return { tickers, bySymbol, error, refresh };
}

export function useCandles(opts: { poolId: string; interval: string }) {
  const { poolId, interval } = opts;
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!poolId) {
      setCandles([]);
      setError(null);
      setLoading(false);
      return;
    }
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

// Fetches the GeckoTerminal pool ID for a single symbol on demand.
// Only fires when a symbol is actively selected — not for all 34 tokens upfront.
export function usePoolId(symbol: string) {
  const [poolId, setPoolId] = useState("");

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    fetch(`/api/dex/pool?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { poolId?: string }) => { if (!cancelled) setPoolId(j.poolId ?? ""); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [symbol]);

  return poolId;
}

// Polls the server-side live price endpoint every 3s.
// Returns a map of symbol → live USD price.
export function useLivePrice(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const symbolKey = symbols.slice().sort().join(",");

  useEffect(() => {
    if (!symbolKey) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/price/live?symbols=${symbolKey}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { prices: Record<string, number> };
        if (!cancelled) setPrices(json.prices);
      } catch { /* silent — fallback to ticker price */ }
    };

    void poll();
    const t = setInterval(() => void poll(), 3_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [symbolKey]);

  return prices;
}
