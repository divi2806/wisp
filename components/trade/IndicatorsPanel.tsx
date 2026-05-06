"use client";

import type { Indicators } from "./CandlesChart";

function Toggle({
  label,
  on,
  color,
  onClick,
}: {
  label: string;
  on: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono font-semibold transition-all"
      style={{
        border: `1px solid ${on ? color : "rgba(255,255,255,0.08)"}`,
        background: on ? `${color}22` : "rgba(255,255,255,0.02)",
        color: on ? color : "#a1a1aa",
      }}
    >
      {label}
    </button>
  );
}

export function IndicatorsPanel({
  indicators,
  setIndicators,
}: {
  indicators: Indicators;
  setIndicators: (updater: (prev: Indicators) => Indicators) => void;
}) {
  return (
    <div
      className="h-full flex flex-col"
      style={{ width: 220, borderRight: "1px solid rgba(255,255,255,0.05)" }}
      aria-label="Indicators"
    >
      <div className="px-3 pt-3 pb-2">
        <p className="font-semibold" style={{ fontSize: 12, color: "#e4e4e7" }}>
          Indicators
        </p>
        <p style={{ fontSize: 10, color: "#3f3f46", marginTop: 2 }}>
          Toggle overlays & oscillators
        </p>
      </div>

      <div className="px-3 pb-3 overflow-y-auto" style={{ maxHeight: 520 }}>
        <p className="mb-2" style={{ fontSize: 10, letterSpacing: "0.14em", color: "#3f3f46", fontWeight: 800, textTransform: "uppercase" }}>
          Overlays
        </p>
        <div className="space-y-2 mb-4">
          {[
            { key: "vwap", label: "VWAP", color: "rgba(255,255,255,0.55)" },
            { key: "bb", label: "Bollinger Bands", color: "rgba(167,139,250,0.7)" },
          ].map((t) => (
            <Toggle
              key={t.key}
              label={t.label}
              on={Boolean(indicators[t.key as keyof Indicators])}
              color={t.color}
              onClick={() => setIndicators((p) => ({ ...p, [t.key]: !p[t.key as keyof Indicators] }))}
            />
          ))}
        </div>

        <p className="mb-2" style={{ fontSize: 10, letterSpacing: "0.14em", color: "#3f3f46", fontWeight: 800, textTransform: "uppercase" }}>
          Moving Averages
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { key: "ma7", label: "MA7", color: "#f59e0b" },
            { key: "ma25", label: "MA25", color: "#a78bfa" },
            { key: "ma50", label: "MA50", color: "rgba(34,197,94,0.75)" },
            { key: "ma99", label: "MA99", color: "#f87171" },
            { key: "ma200", label: "MA200", color: "rgba(251,191,36,0.75)" },
          ].map((t) => (
            <Toggle
              key={t.key}
              label={t.label}
              on={Boolean(indicators[t.key as keyof Indicators])}
              color={t.color}
              onClick={() => setIndicators((p) => ({ ...p, [t.key]: !p[t.key as keyof Indicators] }))}
            />
          ))}
        </div>

        <p className="mb-2" style={{ fontSize: 10, letterSpacing: "0.14em", color: "#3f3f46", fontWeight: 800, textTransform: "uppercase" }}>
          EMAs
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { key: "ema9", label: "EMA9", color: "rgba(56,189,248,0.85)" },
            { key: "ema20", label: "EMA20", color: "#38bdf8" },
            { key: "ema50", label: "EMA50", color: "rgba(167,139,250,0.85)" },
            { key: "ema200", label: "EMA200", color: "rgba(245,158,11,0.85)" },
          ].map((t) => (
            <Toggle
              key={t.key}
              label={t.label}
              on={Boolean(indicators[t.key as keyof Indicators])}
              color={t.color}
              onClick={() => setIndicators((p) => ({ ...p, [t.key]: !p[t.key as keyof Indicators] }))}
            />
          ))}
        </div>

        <p className="mb-2" style={{ fontSize: 10, letterSpacing: "0.14em", color: "#3f3f46", fontWeight: 800, textTransform: "uppercase" }}>
          Oscillators / Volume
        </p>
        <div className="space-y-2">
          {[
            { key: "volSMA20", label: "Volume SMA(20)", color: "rgba(255,255,255,0.35)" },
            { key: "rsi14", label: "RSI(14)", color: "rgba(56,189,248,0.85)" },
            { key: "macd", label: "MACD(12,26,9)", color: "rgba(167,139,250,0.85)" },
          ].map((t) => (
            <Toggle
              key={t.key}
              label={t.label}
              on={Boolean(indicators[t.key as keyof Indicators])}
              color={t.color}
              onClick={() => setIndicators((p) => ({ ...p, [t.key]: !p[t.key as keyof Indicators] }))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

