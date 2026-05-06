"use client";

import { useEffect, useMemo, useState } from "react";

type Side = "buy" | "sell";

export type PaperFill = {
  id: string;
  atMs: number;
  symbol: string;
  side: Side;
  qty: number;
  price: number;
  notional: number;
};

type PaperState = {
  cashUSDT: number;
  fills: PaperFill[];
  openOrders: PaperOrder[];
};

const KEY = "wisp_paper_v1";

function safeParse(raw: string | null): PaperState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as PaperState;
    if (typeof v?.cashUSDT !== "number" || !Array.isArray(v?.fills)) return null;
    if (!Array.isArray(v?.openOrders)) v.openOrders = [];
    return v;
  } catch {
    return null;
  }
}

type OrderType = "market" | "limit";

export type PaperOrder = {
  id: string;
  atMs: number;
  symbol: string;
  side: Side;
  type: OrderType;
  qty: number;
  limitPrice?: number;
};

export function usePaperTrade(enabled: boolean) {
  const [state, setState] = useState<PaperState>(() => {
    if (typeof window === "undefined") return { cashUSDT: 10_000, fills: [], openOrders: [] };
    const v = safeParse(localStorage.getItem(KEY));
    return v ?? { cashUSDT: 10_000, fills: [], openOrders: [] };
  });

  useEffect(() => {
    if (!enabled) return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [enabled, state]);

  const posBySymbol = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of state.fills) {
      const cur = m.get(f.symbol) ?? 0;
      m.set(f.symbol, cur + (f.side === "buy" ? f.qty : -f.qty));
    }
    return m;
  }, [state.fills]);

  const placeMarket = (args: { symbol: string; side: Side; qty: number; price: number }) => {
    const { symbol, side, qty, price } = args;
    const q = Number(qty);
    const p = Number(price);
    if (!Number.isFinite(q) || q <= 0) throw new Error("Invalid quantity");
    if (!Number.isFinite(p) || p <= 0) throw new Error("Invalid price");

    const notional = q * p;

    setState((prev) => {
      if (side === "buy" && prev.cashUSDT < notional) throw new Error("Insufficient USDT balance");
      return {
        openOrders: prev.openOrders,
        cashUSDT: prev.cashUSDT + (side === "buy" ? -notional : notional),
        fills: [
          {
            id: crypto.randomUUID(),
            atMs: Date.now(),
            symbol,
            side,
            qty: q,
            price: p,
            notional,
          },
          ...prev.fills,
        ].slice(0, 200),
      };
    });
  };

  const placeLimit = (args: { symbol: string; side: Side; qty: number; limitPrice: number }) => {
    const { symbol, side, qty, limitPrice } = args;
    const q = Number(qty);
    const p = Number(limitPrice);
    if (!Number.isFinite(q) || q <= 0) throw new Error("Invalid quantity");
    if (!Number.isFinite(p) || p <= 0) throw new Error("Invalid limit price");

    setState((prev) => ({
      ...prev,
      openOrders: [
        {
          id: crypto.randomUUID(),
          atMs: Date.now(),
          symbol,
          side,
          type: "limit" as OrderType,
          qty: q,
          limitPrice: p,
        },
        ...prev.openOrders,
      ].slice(0, 200),
    }));
  };

  const cancelOrder = (id: string) => {
    setState((prev) => ({ ...prev, openOrders: prev.openOrders.filter((o) => o.id !== id) }));
  };

  const clearFills = () => {
    setState((prev) => ({ ...prev, fills: [] }));
  };

  const processMark = (args: { symbol: string; markPrice: number }) => {
    const { symbol, markPrice } = args;
    const px = Number(markPrice);
    if (!Number.isFinite(px) || px <= 0) return;

    setState((prev) => {
      const fills: PaperFill[] = [];
      const keep: PaperOrder[] = [];
      let cashUSDT = prev.cashUSDT;

      for (const o of prev.openOrders) {
        if (o.symbol !== symbol || o.type !== "limit") {
          keep.push(o);
          continue;
        }
        const lp = Number(o.limitPrice ?? 0);
        if (!Number.isFinite(lp) || lp <= 0) {
          keep.push(o);
          continue;
        }
        const shouldFill = o.side === "buy" ? px <= lp : px >= lp;
        if (!shouldFill) {
          keep.push(o);
          continue;
        }

        const notional = o.qty * lp;
        if (o.side === "buy" && cashUSDT < notional) {
          // cannot fill; keep it so user can cancel/adjust
          keep.push(o);
          continue;
        }

        cashUSDT += o.side === "buy" ? -notional : notional;
        fills.push({
          id: crypto.randomUUID(),
          atMs: Date.now(),
          symbol: o.symbol,
          side: o.side,
          qty: o.qty,
          price: lp,
          notional,
        });
      }

      if (fills.length === 0) return prev;
      return {
        cashUSDT,
        openOrders: keep,
        fills: [...fills, ...prev.fills].slice(0, 200),
      };
    });
  };

  const reset = () => setState({ cashUSDT: 10_000, fills: [], openOrders: [] });

  return { state, posBySymbol, placeMarket, placeLimit, cancelOrder, clearFills, processMark, reset };
}

