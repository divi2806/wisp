"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, BarChart3, Lock, TrendingDown, TrendingUp } from "lucide-react";
import type { UTCTimestamp } from "lightweight-charts";
import { TradeTopBar } from "@/components/trade/TradeTopBar";
import WispPageBar from "@/components/WispPageBar";
import { MarketsPanel } from "@/components/trade/MarketsPanel";
import { CandlesChart, type Indicators } from "@/components/trade/CandlesChart";
import { OrderPanel } from "@/components/trade/OrderPanel";
import { DrawingToolbar, type DrawingTool } from "@/components/trade/DrawingToolbar";
import { IndicatorsPanel } from "@/components/trade/IndicatorsPanel";
import { useCandles, useMarkets } from "@/components/trade/useMarketData";
import type { MarketMode } from "@/components/trade/types";
import { usePaperTrade } from "@/components/trade/usePaperTrade";
import { WispTradeChat, type TradeContext as WispTradeContext } from "@/components/trade/WispTradeChat";

function heikinAshi(
  candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[]
) {
  if (!candles.length) return candles;
  const out: typeof candles = [];
  let pO = candles[0].open, pC = candles[0].close;
  for (const c of candles) {
    const haC = (c.open + c.high + c.low + c.close) / 4;
    const haO = (pO + pC) / 2;
    out.push({ ...c, open: haO, high: Math.max(c.high, haO, haC), low: Math.min(c.low, haO, haC), close: haC });
    pO = haO; pC = haC;
  }
  return out;
}

function fmtPrice(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000)  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1)     return n.toFixed(4);
  if (n >= 0.001) return n.toFixed(6);
  return n.toPrecision(5);
}

function computeRSILast(closes: number[], period = 14) {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  let rsi = 100 - 100 / (1 + (loss === 0 ? 100 : gain / loss));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    rsi = 100 - 100 / (1 + (loss === 0 ? 100 : gain / loss));
  }
  return Number.isFinite(rsi) ? rsi : null;
}

function computeEMASeries(values: number[], period: number) {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let ema = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    ema =
      i === period - 1
        ? values.slice(0, period).reduce((s, v) => s + v, 0) / period
        : values[i] * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
}

function computeMACDLast(closes: number[], fast = 12, slow = 26, signal = 9) {
  // Align ema series by taking the overlapping tail.
  const emaFast = computeEMASeries(closes, fast);
  const emaSlow = computeEMASeries(closes, slow);
  if (!emaFast.length || !emaSlow.length) return null;
  const overlap = Math.min(emaFast.length, emaSlow.length);
  const macd = emaFast.slice(emaFast.length - overlap).map((v, i) => v - emaSlow[emaSlow.length - overlap + i]);
  const sig = computeEMASeries(macd, signal);
  if (!sig.length) return null;
  const macdLast = macd[macd.length - 1];
  const sigLast = sig[sig.length - 1];
  const histLast = macdLast - sigLast;
  if (![macdLast, sigLast, histLast].every((x) => Number.isFinite(x))) return null;
  return { macd: macdLast, signal: sigLast, hist: histLast };
}

function computePositionStats(
  fills: { side: "buy" | "sell"; qty: number; price: number; atMs: number }[],
  markPrice: number | null
) {
  // Avg-cost method with signed qty (supports net long or net short).
  let qty = 0;
  let avg = 0;
  const ordered = [...fills].sort((a, b) => a.atMs - b.atMs);
  for (const f of ordered) {
    const delta = (f.side === "buy" ? 1 : -1) * Number(f.qty);
    const px = Number(f.price);
    if (!Number.isFinite(delta) || !Number.isFinite(px) || delta === 0) continue;

    if (qty === 0) {
      qty = delta;
      avg = px;
      continue;
    }

    const sameDir = qty > 0 ? delta > 0 : delta < 0;
    if (sameDir) {
      const newQty = qty + delta;
      avg = (avg * Math.abs(qty) + px * Math.abs(delta)) / Math.abs(newQty);
      qty = newQty;
      continue;
    }

    // Reducing or flipping direction
    const newQty = qty + delta;
    if (qty > 0 && newQty > 0) {
      qty = newQty; // reduced long
    } else if (qty < 0 && newQty < 0) {
      qty = newQty; // reduced short
    } else if (newQty === 0) {
      qty = 0;
      avg = 0;
    } else {
      // flipped
      qty = newQty;
      avg = px;
    }
  }

  const unrealizedPnL =
    markPrice && Number.isFinite(markPrice) && markPrice > 0 && qty !== 0
      ? (markPrice - avg) * qty
      : 0;

  return {
    qty,
    avgEntry: qty !== 0 ? avg : null,
    unrealizedPnL: Number.isFinite(unrealizedPnL) ? unrealizedPnL : null,
  };
}

export default function TradePage() {
  const [mode, setMode]       = useState<MarketMode>("spot");
  const [paper, setPaper]     = useState(true);
  const [activeTool, setActiveTool] = useState<DrawingTool>("cursor");
  const [pendingStep, setPendingStep] = useState(0);
  const [indicators, setIndicators] = useState<Indicators>({});
  const [showIndicators, setShowIndicators] = useState(false);

  const { tickers, bySymbol, poolBySymbol, error: marketsError } = useMarkets("spot");

  const defaultSymbol = useMemo(() => tickers?.[0]?.symbol ?? "SOL", [tickers]);
  const [symbol, setSymbol]   = useState<string>(defaultSymbol);

  const activeSymbol = useMemo(() => {
    if (!tickers) return symbol || defaultSymbol;
    return tickers.some((t) => t.symbol === symbol) ? symbol : defaultSymbol;
  }, [tickers, symbol, defaultSymbol]);
  const availableSymbols = useMemo(() => (tickers ?? []).map((t) => t.symbol).slice(0, 200), [tickers]);

  const [interval, setInterval]     = useState("15m");
  const [candleType, setCandleType] = useState<"candles" | "heikin">("candles");
  const [side, setSide]             = useState<"buy" | "sell">("buy");
  const orderRef  = useRef<HTMLDivElement>(null);

  const poolId = poolBySymbol.get(activeSymbol) ?? "";
  const { candles, loading: candlesLoading, error: candlesError } = useCandles({ poolId, interval });

  const ticker   = bySymbol.get(activeSymbol);
  const livePrice = ticker ? Number(ticker.lastPrice) : null;

  const paperAcct = usePaperTrade(paper);

  useEffect(() => {
    const px = Number(ticker?.lastPrice ?? "0");
    if (!paper || !activeSymbol || !Number.isFinite(px) || px <= 0) return;
    paperAcct.processMark({ symbol: activeSymbol, markPrice: px });
  }, [paper, activeSymbol, ticker?.lastPrice, paperAcct]);

  const displayCandles = useMemo(() => {
    const c = candles ?? [];
    return candleType === "heikin" ? heikinAshi(c) : c;
  }, [candles, candleType]);

  const last = displayCandles.length ? displayCandles[displayCandles.length - 1] : null;
  const closesForIndicators = useMemo(() => displayCandles.map((c) => c.close), [displayCandles]);
  const rsi14Last = useMemo(() => computeRSILast(closesForIndicators, 14), [closesForIndicators]);
  const macdLast = useMemo(() => computeMACDLast(closesForIndicators, 12, 26, 9), [closesForIndicators]);

  const lastChangePct = useMemo(() => {
    if (!last) return null;
    const p = last.open ? ((last.close - last.open) / last.open) * 100 : 0;
    return Number.isFinite(p) ? p : null;
  }, [last]);

  const lastRangePct = useMemo(() => {
    if (!last) return null;
    const p = last.open ? ((last.high - last.low) / last.open) * 100 : 0;
    return Number.isFinite(p) ? p : null;
  }, [last]);

  const markers = useMemo(() => {
    if (!paper || !activeSymbol) return [];
    return paperAcct.state.fills
      .filter((f) => f.symbol === activeSymbol)
      .slice(0, 50)
      .map((f) => ({
        time: Math.floor(f.atMs / 1000) as UTCTimestamp,
        position: f.side === "buy" ? "belowBar" : "aboveBar",
        color: f.side === "buy" ? "#22c55e" : "#f87171",
        shape: f.side === "buy" ? "arrowUp" : "arrowDown",
        text: f.side === "buy" ? "B" : "S",
      } as const));
  }, [paper, activeSymbol, paperAcct.state.fills]);

  // After eraser fires, reset back to cursor
  const handleToolChange = (t: DrawingTool) => {
    setActiveTool(t);
    setPendingStep(0);
  };

  const handleToolComplete = () => {
    setActiveTool("cursor");
    setPendingStep(0);
  };

  return (
    <div className="flex flex-col h-screen">
      <WispPageBar />
      <div
        data-native-scroll
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
      >
      <TradeTopBar mode={mode} setMode={setMode} paper={paper} setPaper={setPaper} symbol={activeSymbol} />

      <div className="px-8 pb-10">
        {mode === "perps" ? (
          <motion.div
            className="max-w-3xl mx-auto rounded-2xl px-6 py-10 text-center"
            style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.06)" }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          >
            <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.22)" }}>
              <Lock size={18} color="#a78bfa" />
            </div>
            <h2 className="font-extrabold tracking-tight" style={{ fontSize: 22, color: "#fafafa" }}>Perps coming soon</h2>
            <p style={{ fontSize: 13, color: "#52525b", lineHeight: 1.7, marginTop: 8 }}>
              We&apos;re shipping Spot first. Perps, funding, and risk controls will land next.
            </p>
            <motion.button onClick={() => setMode("spot")} className="mt-6 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.22)", color: "#38bdf8" }}
              whileHover={{ background: "rgba(56,189,248,0.18)" }} whileTap={{ scale: 0.98 }}>
              Back to Spot
            </motion.button>
          </motion.div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">

              {/* ── Chart card ── */}
              <motion.section
                className="rounded-2xl overflow-hidden"
                style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.06)" }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                aria-label="Chart"
              >
                <div className="flex">
                  {/* Drawing toolbar */}
                  <DrawingToolbar
                    activeTool={activeTool}
                    onToolChange={handleToolChange}
                    pendingStep={pendingStep}
                    showIndicators={showIndicators}
                    onToggleIndicators={() => setShowIndicators((v) => !v)}
                  />

                  {showIndicators && (
                    <IndicatorsPanel
                      indicators={indicators}
                      setIndicators={setIndicators}
                    />
                  )}

                  {/* Chart content */}
                  <div className="flex-1 min-w-0">
                    {/* ── Header row ── */}
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex items-center gap-2">
                        <div>
                          <p className="font-bold" style={{ fontSize: 13, color: "#e4e4e7" }}>{activeSymbol} / USDT</p>
                          <p style={{ fontSize: 10, color: "#3f3f46", marginTop: 1 }}>Solana DEX · live pool data</p>
                        </div>
                        {/* Live price with flash */}
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={ticker?.lastPrice}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ml-2"
                            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                            initial={{ opacity: 0.4 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25 }}
                          >
                            <BarChart3 size={12} color="#3f3f46" />
                            <span className="font-mono font-semibold" style={{ fontSize: 13, color: livePrice && livePrice > 0 ? "#e4e4e7" : "#52525b" }}>
                              {livePrice && livePrice > 0 ? fmtPrice(livePrice) : "—"}
                            </span>
                            {lastChangePct !== null && (
                              <span className="font-mono" style={{ fontSize: 11, color: lastChangePct >= 0 ? "#22c55e" : "#f87171" }}>
                                {lastChangePct >= 0 ? "+" : ""}{lastChangePct.toFixed(2)}%
                              </span>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Quick buy/sell */}
                        <motion.button
                          onClick={() => { setSide("buy"); orderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1"
                          style={{ background: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.24)", color: "#22c55e" }}
                          whileHover={{ background: "rgba(34,197,94,0.18)" }} whileTap={{ scale: 0.98 }}>
                          <TrendingUp size={12} />Buy
                        </motion.button>
                        <motion.button
                          onClick={() => { setSide("sell"); orderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1"
                          style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.22)", color: "#f87171" }}
                          whileHover={{ background: "rgba(248,113,113,0.16)" }} whileTap={{ scale: 0.98 }}>
                          <TrendingDown size={12} />Sell
                        </motion.button>

                        <select value={candleType} onChange={(e) => setCandleType(e.target.value as "candles" | "heikin")}
                          className="px-2.5 py-1.5 rounded-xl text-xs bg-transparent outline-none"
                          style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#e4e4e7" }}>
                          <option value="candles"  style={{ background: "#0b0d1a" }}>Candles</option>
                          <option value="heikin"   style={{ background: "#0b0d1a" }}>Heikin Ashi</option>
                        </select>

                        {/* Timeframe picker */}
                        <div className="flex items-center rounded-xl overflow-hidden"
                          style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                          {["1m", "5m", "15m", "1h", "4h", "1d"].map((it) => (
                            <button key={it} onClick={() => setInterval(it)}
                              className="px-2.5 py-1.5 text-xs font-mono transition-colors"
                              style={{
                                background: interval === it ? "rgba(167,139,250,0.18)" : "transparent",
                                color: interval === it ? "#a78bfa" : "#52525b",
                                fontWeight: interval === it ? 700 : 400,
                              }}>
                              {it}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── OHLC bar ── */}
                    <div className="px-4 pb-2 flex flex-wrap gap-x-3 gap-y-1" style={{ fontSize: 11 }}>
                      {[
                        { label: "O", value: last?.open,  color: "#a1a1aa" },
                        { label: "H", value: last?.high,  color: "#22c55e" },
                        { label: "L", value: last?.low,   color: "#f87171" },
                        { label: "C", value: last?.close, color: "#e4e4e7" },
                      ].map(({ label, value, color }) => (
                        <span key={label} style={{ color: "#3f3f46" }}>
                          {label}{" "}
                          <span className="font-mono" style={{ color }}>
                            {value != null ? fmtPrice(value) : "—"}
                          </span>
                        </span>
                      ))}
                      <span style={{ color: "#3f3f46" }}>
                        Chg{" "}
                        <span className="font-mono" style={{ color: (lastChangePct ?? 0) >= 0 ? "#22c55e" : "#f87171" }}>
                          {lastChangePct === null ? "—" : `${lastChangePct >= 0 ? "+" : ""}${lastChangePct.toFixed(2)}%`}
                        </span>
                      </span>
                      <span style={{ color: "#3f3f46" }}>
                        Range{" "}
                        <span className="font-mono" style={{ color: "#a1a1aa" }}>
                          {lastRangePct === null ? "—" : `${lastRangePct.toFixed(2)}%`}
                        </span>
                      </span>
                      {/* Tool hint */}
                      {activeTool !== "cursor" && (
                        <span className="ml-auto font-semibold" style={{ color: "#a78bfa" }}>
                          {activeTool === "hline"     && "Click to place horizontal line"}
                          {activeTool === "trendline" && (pendingStep === 0 ? "Click first point" : "Click second point")}
                          {activeTool === "fib"       && (pendingStep === 0 ? "Click swing high" : "Click swing low")}
                          {activeTool === "eraser"    && "Clearing…"}
                        </span>
                      )}
                    </div>

                    {/* ── Chart error / chart ── */}
                    {candlesError ? (
                      <div className="px-4 pb-4 flex items-start gap-2">
                        <AlertTriangle size={14} color="#f87171" style={{ marginTop: 2, flexShrink: 0 }} />
                        <p style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.45 }}>{candlesError}</p>
                      </div>
                    ) : !poolId ? (
                      <div className="px-4 pb-4">
                        <div
                          className="rounded-2xl overflow-hidden flex items-center justify-center text-center"
                          style={{
                            height: 620,
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="px-6">
                            <p className="font-semibold" style={{ color: "#a1a1aa", fontSize: 13 }}>
                              No chart available for {activeSymbol}
                            </p>
                            <p style={{ color: "#3f3f46", fontSize: 11, marginTop: 6, lineHeight: 1.6 }}>
                              This token is treated as a stable asset in Markets. Pick a non-stable token (SOL, JUP, BONK…)
                              to view pool candles.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : candlesLoading && (!displayCandles || displayCandles.length === 0) ? (
                      <div className="px-4 pb-4">
                        <div
                          className="rounded-2xl overflow-hidden"
                          style={{
                            height: 620,
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="h-full w-full flex items-center justify-center relative">
                            {/* shimmer blocks */}
                            <motion.div
                              className="absolute inset-0"
                              style={{
                                background:
                                  "linear-gradient(110deg, transparent 0%, rgba(167,139,250,0.10) 35%, transparent 70%)",
                                transform: "translateX(-60%)",
                              }}
                              animate={{ transform: ["translateX(-60%)", "translateX(60%)"] }}
                              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <div className="relative text-center px-6">
                              <p className="font-semibold" style={{ color: "#a1a1aa", fontSize: 13 }}>
                                Loading chart…
                              </p>
                              <p style={{ color: "#3f3f46", fontSize: 11, marginTop: 6 }}>
                                Fetching pool candles and indicators
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="px-2 pb-2">
                          <CandlesChart
                            candles={displayCandles}
                            height={620}
                            markers={markers}
                            activeTool={activeTool}
                            onToolComplete={handleToolComplete}
                            onPendingStep={setPendingStep}
                            livePrice={livePrice}
                            symbol={activeSymbol}
                            indicators={indicators}
                          />
                        </div>
                        <div className="px-4 pb-3 flex items-center justify-between" style={{ fontSize: 10 }}>
                          <span style={{ color: "#52525b" }}>
                            {candlesLoading ? (
                              <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>
                                Updating…
                              </motion.span>
                            ) : "Live · ~15s refresh"}
                          </span>
                          <span className="font-mono" style={{ color: "#27272a" }}>GeckoTerminal · Solana DEX</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.section>

              {/* ── Order panel ── */}
              <motion.div ref={orderRef}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}>
                <OrderPanel mode={mode} paper={paper} symbol={activeSymbol} ticker={ticker} side={side} setSide={setSide} />
              </motion.div>
            </div>

            {/* ── Markets below chart ── */}
            <div className="mt-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <MarketsPanel mode={mode} tickers={tickers} activeSymbol={activeSymbol} onPick={setSymbol} error={marketsError} />
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Wisp chat (trade copilot) */}
      <WispTradeChat
        onPickSymbol={(s) => setSymbol(s)}
        availableSymbols={availableSymbols}
        context={{
          symbol: activeSymbol,
          interval,
          candleType,
          indicators,
          livePrice,
          recentCandles: displayCandles
            .slice(Math.max(0, displayCandles.length - 120))
            .map((c) => ({ t: c.time, o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume })),
          indicatorValues: {
            rsi14: rsi14Last,
            macd: macdLast,
          },
          lastCandle: last
            ? {
                open: last.open,
                high: last.high,
                low: last.low,
                close: last.close,
                changePct: lastChangePct,
                rangePct: lastRangePct,
              }
            : null,
          paper: {
            enabled: paper,
            cashUSDT: paperAcct.state.cashUSDT,
            position: paperAcct.posBySymbol.get(activeSymbol) ?? 0,
            ...computePositionStats(
              paperAcct.state.fills.filter((f) => f.symbol === activeSymbol),
              livePrice
            ),
            openOrdersCount: paperAcct.state.openOrders.length,
            fillsCount: paperAcct.state.fills.length,
            latestFills: paperAcct.state.fills
              .filter((f) => f.symbol === activeSymbol)
              .slice(0, 25)
              .map((f) => ({ atMs: f.atMs, side: f.side, qty: f.qty, price: f.price, notional: f.notional })),
            openOrders: paperAcct.state.openOrders
              .filter((o) => o.symbol === activeSymbol)
              .slice(0, 25)
              .map((o) => ({
                id: o.id,
                atMs: o.atMs,
                side: o.side,
                type: o.type,
                qty: o.qty,
                limitPrice: o.limitPrice ?? null,
              })),
          },
        } satisfies WispTradeContext}
      />
      </div>
    </div>
  );
}
