"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  AreaSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type Time,
  type SeriesMarker,
  type ISeriesMarkersPluginApi,
  type IPriceLine,
} from "lightweight-charts";
import type { Candle } from "./types";
import type { DrawingTool } from "./DrawingToolbar";

/* ── Indicator math ──────────────────────────────────────────────────────── */
type Pt = { time: UTCTimestamp; value: number };

function precisionForPrice(p: number) {
  if (!Number.isFinite(p) || p <= 0) return { precision: 2, minMove: 0.01 };
  if (p >= 1000) return { precision: 2, minMove: 0.01 };
  if (p >= 1) return { precision: 4, minMove: 0.0001 };
  if (p >= 0.01) return { precision: 6, minMove: 0.000001 };
  if (p >= 0.001) return { precision: 7, minMove: 0.0000001 };
  // ultra-small (BONK-style)
  return { precision: 10, minMove: 0.0000000001 };
}

function computeSMA(pts: Pt[], period: number): Pt[] {
  const out: Pt[] = [];
  for (let i = period - 1; i < pts.length; i++) {
    const sum = pts.slice(i - period + 1, i + 1).reduce((s, d) => s + d.value, 0);
    out.push({ time: pts[i].time, value: sum / period });
  }
  return out;
}

function computeEMA(pts: Pt[], period: number): Pt[] {
  const k = 2 / (period + 1);
  const out: Pt[] = [];
  let ema = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i < period - 1) continue;
    ema = i === period - 1
      ? pts.slice(0, period).reduce((s, d) => s + d.value, 0) / period
      : pts[i].value * k + ema * (1 - k);
    out.push({ time: pts[i].time, value: ema });
  }
  return out;
}

function computeBB(pts: Pt[], period = 20, mult = 2) {
  const upper: Pt[] = [], lower: Pt[] = [];
  for (let i = period - 1; i < pts.length; i++) {
    const slice = pts.slice(i - period + 1, i + 1).map((d) => d.value);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const std  = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    upper.push({ time: pts[i].time, value: mean + mult * std });
    lower.push({ time: pts[i].time, value: mean - mult * std });
  }
  return { upper, lower };
}

function computeVWAP(candles: Candle[]): Pt[] {
  let cumPV = 0;
  let cumV = 0;
  const out: Pt[] = [];
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    cumPV += tp * c.volume;
    cumV += c.volume;
    if (cumV > 0) out.push({ time: c.time as UTCTimestamp, value: cumPV / cumV });
  }
  return out;
}

function computeRSI(closes: Pt[], period = 14): Pt[] {
  if (closes.length < period + 1) return [];
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i].value - closes[i - 1].value;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  const out: Pt[] = [];
  const rs0 = loss === 0 ? 100 : gain / loss;
  out.push({ time: closes[period].time, value: 100 - 100 / (1 + rs0) });
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i].value - closes[i - 1].value;
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    const rs = loss === 0 ? 100 : gain / loss;
    out.push({ time: closes[i].time, value: 100 - 100 / (1 + rs) });
  }
  return out;
}

function computeMACD(closes: Pt[], fast = 12, slow = 26, signal = 9) {
  const emaFast = computeEMA(closes, fast);
  const emaSlow = computeEMA(closes, slow);
  const byTime = new Map<number, { f?: number; s?: number }>();
  for (const p of emaFast) byTime.set(p.time, { ...(byTime.get(p.time) ?? {}), f: p.value });
  for (const p of emaSlow) byTime.set(p.time, { ...(byTime.get(p.time) ?? {}), s: p.value });

  const macd: Pt[] = [];
  const times = Array.from(byTime.keys()).sort((a, b) => a - b);
  for (const t of times) {
    const v = byTime.get(t);
    if (v?.f == null || v?.s == null) continue;
    macd.push({ time: t as UTCTimestamp, value: v.f - v.s });
  }
  const sig = computeEMA(macd, signal);
  const sigByTime = new Map<number, number>(sig.map((p) => [p.time, p.value]));
  const hist = macd
    .filter((p) => sigByTime.has(p.time))
    .map((p) => ({ time: p.time, value: p.value - (sigByTime.get(p.time) ?? 0) }));
  return { macd, signal: sig, hist };
}

/* ── Types ───────────────────────────────────────────────────────────────── */
export type Indicators = {
  ma7?: boolean; ma25?: boolean; ma50?: boolean; ma99?: boolean; ma200?: boolean;
  ema9?: boolean; ema20?: boolean; ema50?: boolean; ema200?: boolean;
  vwap?: boolean;
  bb?: boolean;
  volSMA20?: boolean;
  rsi14?: boolean;
  macd?: boolean;
};

type TrendLine = ISeriesApi<"Line">;
type Drawing = { priceLines: IPriceLine[]; trendLines: TrendLine[]; fibLines: IPriceLine[] };
type PendingPoint = { time: UTCTimestamp; price: number };
type IndSeries = {
  ma7?: ISeriesApi<"Line">; ma25?: ISeriesApi<"Line">; ma50?: ISeriesApi<"Line">; ma99?: ISeriesApi<"Line">; ma200?: ISeriesApi<"Line">;
  ema9?: ISeriesApi<"Line">; ema20?: ISeriesApi<"Line">; ema50?: ISeriesApi<"Line">; ema200?: ISeriesApi<"Line">;
  vwap?: ISeriesApi<"Line">;
  bbUpper?: ISeriesApi<"Line">; bbLower?: ISeriesApi<"Area">;
  volSMA20?: ISeriesApi<"Line">;
  rsi14?: ISeriesApi<"Line">;
  macdLine?: ISeriesApi<"Line">;
  macdSignal?: ISeriesApi<"Line">;
  macdHist?: ISeriesApi<"Histogram">;
};

const FIB_LEVELS  = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS  = ["#52525b","#f59e0b","#22c55e","#38bdf8","#a78bfa","#f87171","#52525b"];

/* ════════════════════════════════════════════════════════════════════════════ */
export function CandlesChart(props: {
  candles: Candle[] | null;
  height?: number;
  markers?: SeriesMarker<UTCTimestamp>[];
  activeTool?: DrawingTool;
  onToolComplete?: () => void;
  onPendingStep?: (step: number) => void;
  livePrice?: number | null;
  referencePrice?: { price: number | null; title: string; color?: string } | null;
  symbol?: string;
  indicators?: Indicators;
}) {
  const { candles, height = 420, markers, activeTool = "cursor",
    onToolComplete, onPendingStep, livePrice, referencePrice, symbol, indicators = {} } = props;

  const wrapRef     = useRef<HTMLDivElement>(null);
  const chartRef    = useRef<IChartApi | null>(null);
  const seriesRef   = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef      = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markersRef  = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const indRef      = useRef<IndSeries>({});
  const drawRef     = useRef<Drawing>({ priceLines: [], trendLines: [], fibLines: [] });
  const referenceLineRef = useRef<IPriceLine | null>(null);
  const pendingRef  = useRef<PendingPoint | null>(null);

  const activeToolRef   = useRef(activeTool);
  const onCompleteRef   = useRef(onToolComplete);
  const onPendingRef    = useRef(onPendingStep);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { onCompleteRef.current = onToolComplete; }, [onToolComplete]);
  useEffect(() => { onPendingRef.current = onPendingStep; }, [onPendingStep]);

  const data = useMemo(() => (candles ?? []).map((c) => ({
    time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close,
  })), [candles]);

  const volData = useMemo(() => (candles ?? []).map((c) => ({
    time: c.time as UTCTimestamp, value: c.volume,
    color: c.close >= c.open
      ? "rgba(34,197,94,0.45)"
      : "rgba(248,113,113,0.38)",
  })), [candles]);

  /* ── Chart init ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const chart = createChart(el, {
      height,
      layout: {
        background: { color: "transparent" },
        textColor: "#52525b",
        fontSize: 11, fontFamily: "'JetBrains Mono','Fira Mono',monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      timeScale: { borderColor: "rgba(255,255,255,0.06)", timeVisible: true, secondsVisible: false },
      crosshair: {
        mode: 1,
        vertLine: { color: "rgba(167,139,250,0.4)", labelBackgroundColor: "#1e1b4b", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "rgba(167,139,250,0.4)", labelBackgroundColor: "#1e1b4b", width: 1, style: LineStyle.Dashed },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#f87171", borderVisible: false,
      wickUpColor: "#22c55e", wickDownColor: "#f87171",
    });

    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol" });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    chartRef.current  = chart;
    seriesRef.current = series;
    volRef.current    = vol;
    markersRef.current = createSeriesMarkers(series, []);
    drawRef.current   = { priceLines: [], trendLines: [], fibLines: [] };
    pendingRef.current = null;
    indRef.current    = {};

    /* ── Drawing click handler ── */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleClick = (param: any) => {
      const tool = activeToolRef.current;
      if (tool === "cursor" || tool === "eraser") return;
      if (!param.point || !param.time) return;
      const s = seriesRef.current;
      const c = chartRef.current;
      if (!s || !c) return;
      const price = s.coordinateToPrice(param.point.y);
      if (price === null) return;
      const time = param.time as UTCTimestamp;

      if (tool === "hline") {
        const pl = s.createPriceLine({
          price, color: "#a78bfa", lineWidth: 1, lineStyle: LineStyle.Dashed,
          axisLabelVisible: true, title: `${price.toPrecision(5)}`,
        });
        drawRef.current.priceLines.push(pl);
        onCompleteRef.current?.();
        return;
      }

      if (tool === "trendline" || tool === "fib") {
        if (!pendingRef.current) {
          pendingRef.current = { time, price };
          onPendingRef.current?.(1);
        } else {
          const p1 = pendingRef.current;
          pendingRef.current = null;
          onPendingRef.current?.(0);

          if (tool === "trendline") {
            const tl = c.addSeries(LineSeries, {
              color: "#38bdf8", lineWidth: 1, lineStyle: LineStyle.Solid,
              crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
            });
            const [a, b] = p1.time < time ? [p1, { time, price }] : [{ time, price }, p1];
            tl.setData([{ time: a.time, value: a.price }, { time: b.time, value: b.price }]);
            drawRef.current.trendLines.push(tl);
          } else {
            const lo = Math.min(p1.price, price), hi = Math.max(p1.price, price);
            FIB_LEVELS.forEach((lvl, i) => {
              const pl = s.createPriceLine({
                price: lo + lvl * (hi - lo), color: FIB_COLORS[i], lineWidth: 1,
                lineStyle: LineStyle.Dashed, axisLabelVisible: true,
                title: `${(lvl * 100).toFixed(1)}%`,
              });
              drawRef.current.fibLines.push(pl);
            });
          }
          onCompleteRef.current?.();
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chart as any).subscribeClick(handleClick);

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: Math.floor(el.getBoundingClientRect().width) });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chart as any).unsubscribeClick(handleClick);
      chart.remove();
      chartRef.current = seriesRef.current = volRef.current = markersRef.current = null;
      referenceLineRef.current = null;
      indRef.current = {};
    };
  }, [height]);

  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    if (referenceLineRef.current) {
      try { s.removePriceLine(referenceLineRef.current); } catch { /* ignore */ }
      referenceLineRef.current = null;
    }
    if (!referencePrice?.price || !Number.isFinite(referencePrice.price)) return;
    referenceLineRef.current = s.createPriceLine({
      price: referencePrice.price,
      color: referencePrice.color ?? "#fbbf24",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: referencePrice.title,
    });
  }, [referencePrice?.price, referencePrice?.title, referencePrice?.color]);

  /* ── Erase drawings ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (activeTool !== "eraser") return;
    const s = seriesRef.current, c = chartRef.current;
    if (!s || !c) return;
    drawRef.current.priceLines.forEach((pl) => { try { s.removePriceLine(pl); } catch { /* ignore */ } });
    drawRef.current.fibLines.forEach((fl)   => { try { s.removePriceLine(fl); } catch { /* ignore */ } });
    drawRef.current.trendLines.forEach((tl) => { try { c.removeSeries(tl);   } catch { /* ignore */ } });
    drawRef.current = { priceLines: [], trendLines: [], fibLines: [] };
    pendingRef.current = null;
    onCompleteRef.current?.();
  }, [activeTool]);

  /* ── Clear drawings on symbol change ───────────────────────────────────── */
  useEffect(() => {
    const s = seriesRef.current, c = chartRef.current;
    if (!s || !c) return;
    drawRef.current.priceLines.forEach((pl) => { try { s.removePriceLine(pl); } catch { /* ignore */ } });
    drawRef.current.fibLines.forEach((fl)   => { try { s.removePriceLine(fl); } catch { /* ignore */ } });
    drawRef.current.trendLines.forEach((tl) => { try { c.removeSeries(tl);   } catch { /* ignore */ } });
    drawRef.current = { priceLines: [], trendLines: [], fibLines: [] };
    pendingRef.current = null;
  }, [symbol]);

  /* ── Push candle + volume data + indicators ─────────────────────────────── */
  useEffect(() => {
    const s = seriesRef.current, c = chartRef.current;
    if (!s || !c) return;
    const lastClose = data.length ? Number(data[data.length - 1].close) : 0;
    const fmt = precisionForPrice(lastClose);
    s.applyOptions({ priceFormat: { type: "price", precision: fmt.precision, minMove: fmt.minMove } });
    s.setData(data);
    volRef.current?.setData(volData);
    if (markersRef.current) markersRef.current.setMarkers(markers ?? []);
    c.timeScale().fitContent();

    const closes: Pt[] = data.map((d) => ({ time: d.time, value: d.close }));

    /* helper: ensure indicator series exists, create if needed */
    function ensureLine(
      key: keyof IndSeries,
      color: string,
      width: 1 | 2 = 1,
    ): ISeriesApi<"Line"> {
      if (!indRef.current[key]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (indRef.current as any)[key] = c!.addSeries(LineSeries, {
          color, lineWidth: width, crosshairMarkerVisible: false,
          lastValueVisible: false, priceLineVisible: false,
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (indRef.current as any)[key] as ISeriesApi<"Line">;
    }

    function removeLine(key: keyof IndSeries) {
      const series = indRef.current[key];
      if (series) { try { c!.removeSeries(series); } catch { /* ignore */ } delete indRef.current[key]; }
    }

    // MA7
    if (indicators.ma7) {
      ensureLine("ma7", "#f59e0b", 1).setData(computeSMA(closes, 7));
    } else { removeLine("ma7"); }

    // MA25
    if (indicators.ma25) {
      ensureLine("ma25", "#a78bfa", 1).setData(computeSMA(closes, 25));
    } else { removeLine("ma25"); }

    // MA50
    if (indicators.ma50) {
      ensureLine("ma50", "rgba(34,197,94,0.75)", 1).setData(computeSMA(closes, 50));
    } else { removeLine("ma50"); }

    // MA99
    if (indicators.ma99) {
      ensureLine("ma99", "#f87171", 1).setData(computeSMA(closes, 99));
    } else { removeLine("ma99"); }

    // MA200
    if (indicators.ma200) {
      ensureLine("ma200", "rgba(251,191,36,0.75)", 1).setData(computeSMA(closes, 200));
    } else { removeLine("ma200"); }

    // EMA9
    if (indicators.ema9) {
      ensureLine("ema9", "rgba(56,189,248,0.85)", 1).setData(computeEMA(closes, 9));
    } else { removeLine("ema9"); }

    // EMA20
    if (indicators.ema20) {
      ensureLine("ema20", "#38bdf8", 1).setData(computeEMA(closes, 20));
    } else { removeLine("ema20"); }

    // EMA50
    if (indicators.ema50) {
      ensureLine("ema50", "rgba(167,139,250,0.85)", 1).setData(computeEMA(closes, 50));
    } else { removeLine("ema50"); }

    // EMA200
    if (indicators.ema200) {
      ensureLine("ema200", "rgba(245,158,11,0.85)", 1).setData(computeEMA(closes, 200));
    } else { removeLine("ema200"); }

    // VWAP
    if (indicators.vwap) {
      ensureLine("vwap", "rgba(255,255,255,0.55)", 1).setData(computeVWAP(candles ?? []));
    } else { removeLine("vwap"); }

    // Bollinger Bands
    if (indicators.bb) {
      const bb = computeBB(closes, 20, 2);
      ensureLine("bbUpper", "rgba(167,139,250,0.6)", 1).setData(bb.upper);
      if (!indRef.current.bbLower) {
        indRef.current.bbLower = c.addSeries(AreaSeries, {
          topColor: "rgba(167,139,250,0.06)",
          bottomColor: "rgba(167,139,250,0.0)",
          lineColor: "rgba(167,139,250,0.6)",
          lineWidth: 1,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
        });
      }
      indRef.current.bbLower.setData(bb.lower);
    } else {
      removeLine("bbUpper");
      if (indRef.current.bbLower) {
        try { c.removeSeries(indRef.current.bbLower); } catch { /* ignore */ }
        delete indRef.current.bbLower;
      }
    }

    // Volume SMA20 (overlay on volume scale)
    if (indicators.volSMA20) {
      if (!indRef.current.volSMA20) {
        indRef.current.volSMA20 = c.addSeries(LineSeries, {
          color: "rgba(255,255,255,0.35)",
          lineWidth: 1,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
          priceScaleId: "vol",
        });
      }
      const vPts: Pt[] = volData.map((d) => ({ time: d.time, value: d.value }));
      indRef.current.volSMA20.setData(computeSMA(vPts, 20));
    } else if (indRef.current.volSMA20) {
      try { c.removeSeries(indRef.current.volSMA20); } catch { /* ignore */ }
      delete indRef.current.volSMA20;
    }

    // RSI14 (sub-pane 1)
    if (indicators.rsi14) {
      if (!indRef.current.rsi14) {
        indRef.current.rsi14 = c.addSeries(LineSeries, {
          color: "rgba(56,189,248,0.85)",
          lineWidth: 1,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
        }, 1);
      }
      indRef.current.rsi14.setData(computeRSI(closes, 14));
    } else if (indRef.current.rsi14) {
      try { c.removeSeries(indRef.current.rsi14); } catch { /* ignore */ }
      delete indRef.current.rsi14;
    }

    // MACD (sub-pane 2)
    if (indicators.macd) {
      if (!indRef.current.macdHist) {
        indRef.current.macdHist = c.addSeries(HistogramSeries, {
          priceLineVisible: false,
          lastValueVisible: false,
          color: "rgba(167,139,250,0.5)",
        }, 2);
      }
      if (!indRef.current.macdLine) {
        indRef.current.macdLine = c.addSeries(LineSeries, {
          color: "rgba(167,139,250,0.85)",
          lineWidth: 1,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
        }, 2);
      }
      if (!indRef.current.macdSignal) {
        indRef.current.macdSignal = c.addSeries(LineSeries, {
          color: "rgba(251,191,36,0.85)",
          lineWidth: 1,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
        }, 2);
      }
      const m = computeMACD(closes, 12, 26, 9);
      indRef.current.macdLine.setData(m.macd);
      indRef.current.macdSignal.setData(m.signal);
      indRef.current.macdHist.setData(m.hist.map((p) => ({
        time: p.time,
        value: p.value,
        color: p.value >= 0 ? "rgba(34,197,94,0.45)" : "rgba(248,113,113,0.38)",
      })));
    } else {
      (["macdHist", "macdLine", "macdSignal"] as const).forEach((k) => {
        const srs = indRef.current[k];
        if (srs) {
          try { c.removeSeries(srs as never); } catch { /* ignore */ }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (indRef.current as any)[k];
        }
      });
    }
  }, [data, volData, markers, indicators, candles]);

  /* ── Live price: update last candle in real time ────────────────────────── */
  useEffect(() => {
    if (!livePrice || !seriesRef.current || !data.length) return;
    const last = data[data.length - 1];
    seriesRef.current.update({
      time: last.time,
      open: last.open,
      high: Math.max(last.high, livePrice),
      low:  Math.min(last.low,  livePrice),
      close: livePrice,
    });
  }, [livePrice, data]);

  const cursor = activeTool === "cursor" ? "default" : "crosshair";
  return <div ref={wrapRef} className="w-full" style={{ height, cursor }} />;
}
