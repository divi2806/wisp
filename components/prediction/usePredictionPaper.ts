"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  PredictionAction,
  PredictionFill,
  PredictionMarket,
  PredictionOutcome,
  PredictionPaperState,
  PredictionPosition,
  PredictionSettlement,
  PredictionSide,
} from "@/components/prediction/types";

const KEY = "wisp_prediction_paper_v1";
const STARTING_CASH = 1_000;

function safeParse(raw: string | null): PredictionPaperState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PredictionPaperState;
    if (typeof parsed?.cashUSDC !== "number") return null;
    if (!Array.isArray(parsed.positions) || !Array.isArray(parsed.fills) || !Array.isArray(parsed.settlements)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function emptyState(): PredictionPaperState {
  return { cashUSDC: STARTING_CASH, positions: [], fills: [], settlements: [] };
}

function positionKey(contractId: string, side: PredictionSide) {
  return `${contractId}:${side}`;
}

function marketPrice(market: PredictionMarket, side: PredictionSide) {
  return side === "yes" ? market.yesPrice : market.noPrice;
}

function settleOutcome(startPrice: number, finalPrice: number): PredictionOutcome {
  if (finalPrice > startPrice) return "yes";
  if (finalPrice < startPrice) return "no";
  return "draw";
}

function settlementPriceFor(market: PredictionMarket, endTimeMs: number) {
  const finalCandleTime = Math.floor((endTimeMs - 60_000) / 1000);
  const finalCandle = market.candles.find((candle) => candle.time === finalCandleTime);
  return finalCandle?.close ?? null;
}

export function usePredictionPaper(markets: PredictionMarket[]) {
  const [state, setState] = useState<PredictionPaperState>(() => {
    if (typeof window === "undefined") return emptyState();
    return safeParse(window.localStorage.getItem(KEY)) ?? emptyState();
  });

  useEffect(() => {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!markets.length) return;
    const marketByContract = new Map(markets.map((market) => [market.contractId, market]));
    const marketByKey = new Map(markets.map((market) => [market.key, market]));

    setState((prev) => {
      const keep: PredictionPosition[] = [];
      const settlements: PredictionSettlement[] = [];
      let cashUSDC = prev.cashUSDC;

      for (const position of prev.positions) {
        if (Date.now() < position.endTimeMs) {
          keep.push(position);
          continue;
        }

        const market = marketByContract.get(position.contractId) ?? marketByKey.get(position.marketKey);
        const finalPrice = market ? settlementPriceFor(market, position.endTimeMs) : null;
        if (!finalPrice || !Number.isFinite(finalPrice)) {
          keep.push(position);
          continue;
        }

        const outcome = settleOutcome(position.startPrice, finalPrice);
        const payoutPerShare = outcome === "draw" ? 0.5 : outcome === position.side ? 1 : 0;
        const payout = position.shares * payoutPerShare;
        const cost = position.shares * position.avgPrice;
        cashUSDC += payout;
        settlements.push({
          id: crypto.randomUUID(),
          atMs: Date.now(),
          contractId: position.contractId,
          marketKey: position.marketKey,
          asset: position.asset,
          durationMinutes: position.durationMinutes,
          question: position.question,
          side: position.side,
          shares: position.shares,
          avgPrice: position.avgPrice,
          startPrice: position.startPrice,
          finalPrice,
          outcome,
          payout,
          pnl: payout - cost,
        });
      }

      if (!settlements.length) return prev;
      return {
        cashUSDC,
        positions: keep,
        fills: prev.fills,
        settlements: [...settlements, ...prev.settlements].slice(0, 100),
      };
    });
  }, [markets]);

  const positionsByKey = useMemo(() => {
    const map = new Map<string, PredictionPosition>();
    for (const position of state.positions) {
      map.set(positionKey(position.contractId, position.side), position);
    }
    return map;
  }, [state.positions]);

  const portfolioValue = useMemo(() => {
    let value = state.cashUSDC;
    for (const position of state.positions) {
      const market = markets.find((item) => item.contractId === position.contractId);
      if (!market) continue;
      value += position.shares * marketPrice(market, position.side);
    }
    return value;
  }, [markets, state.cashUSDC, state.positions]);

  const placeOrder = (args: {
    market: PredictionMarket;
    side: PredictionSide;
    action: PredictionAction;
    shares: number;
  }) => {
    const shares = Number(args.shares);
    if (!Number.isFinite(shares) || shares <= 0) throw new Error("Enter a valid share amount.");
    const startPrice = args.market.startPrice;
    const livePrice = args.market.livePrice;
    if (!startPrice || !livePrice) throw new Error("Market is not ready yet.");
    if (args.market.timeRemainingMs <= 0) throw new Error("This window is settling. Wait for the next market.");

    const price = marketPrice(args.market, args.side);
    if (!Number.isFinite(price) || price <= 0 || price >= 1) throw new Error("Price unavailable.");
    const notional = shares * price;
    const key = positionKey(args.market.contractId, args.side);
    const currentPosition = state.positions.find((position) => positionKey(position.contractId, position.side) === key);

    if (args.action === "buy" && state.cashUSDC < notional) {
      throw new Error("Insufficient paper USDC.");
    }

    if (args.action === "sell" && (!currentPosition || currentPosition.shares < shares)) {
      throw new Error(`You do not hold ${shares.toFixed(2)} ${args.side.toUpperCase()} shares.`);
    }

    setState((prev) => {
      const existing = prev.positions.find((position) => positionKey(position.contractId, position.side) === key);

      if (args.action === "buy") {
        const updated: PredictionPosition = existing
          ? {
              ...existing,
              shares: existing.shares + shares,
              avgPrice: (existing.avgPrice * existing.shares + price * shares) / (existing.shares + shares),
            }
          : {
              id: crypto.randomUUID(),
              contractId: args.market.contractId,
              marketKey: args.market.key,
              asset: args.market.asset,
              symbol: args.market.symbol,
              durationMinutes: args.market.durationMinutes,
              question: args.market.question,
              side: args.side,
              shares,
              avgPrice: price,
              openedAtMs: Date.now(),
              startTimeMs: args.market.startTimeMs,
              endTimeMs: args.market.endTimeMs,
              startPrice,
            };

        return {
          cashUSDC: prev.cashUSDC - notional,
          positions: existing
            ? prev.positions.map((position) => (position.id === existing.id ? updated : position))
            : [updated, ...prev.positions],
          fills: [
            fillFromOrder(args.market, args.side, "buy", shares, price, notional),
            ...prev.fills,
          ].slice(0, 200),
          settlements: prev.settlements,
        };
      }

      if (!existing || existing.shares < shares) return prev;
      const remaining = existing.shares - shares;
      return {
        cashUSDC: prev.cashUSDC + notional,
        positions:
          remaining <= 1e-9
            ? prev.positions.filter((position) => position.id !== existing.id)
            : prev.positions.map((position) => (position.id === existing.id ? { ...existing, shares: remaining } : position)),
        fills: [
          fillFromOrder(args.market, args.side, "sell", shares, price, notional),
          ...prev.fills,
        ].slice(0, 200),
        settlements: prev.settlements,
      };
    });
  };

  const reset = () => setState(emptyState());
  const clearHistory = () => setState((prev) => ({ ...prev, fills: [], settlements: [] }));

  return {
    state,
    positionsByKey,
    portfolioValue,
    placeOrder,
    reset,
    clearHistory,
  };
}

function fillFromOrder(
  market: PredictionMarket,
  side: PredictionSide,
  action: PredictionAction,
  shares: number,
  price: number,
  notional: number
): PredictionFill {
  return {
    id: crypto.randomUUID(),
    atMs: Date.now(),
    contractId: market.contractId,
    marketKey: market.key,
    asset: market.asset,
    durationMinutes: market.durationMinutes,
    question: market.question,
    side,
    action,
    shares,
    price,
    notional,
  };
}
