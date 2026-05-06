"use client";

import { useMemo } from "react";

type MiniCandle = { t: number; o: number; h: number; l: number; c: number; v: number };
type MiniFill = { atMs: number; side: "buy" | "sell"; qty: number; price: number; notional: number };

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

export function MiniCandleViz(props: {
  candles: MiniCandle[];
  fills?: MiniFill[];
  height?: number;
}) {
  const { candles, fills = [], height = 120 } = props;

  const view = useMemo(() => {
    const c = candles.slice(Math.max(0, candles.length - 64));
    if (c.length === 0) return null;

    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (const k of c) {
      lo = Math.min(lo, k.l);
      hi = Math.max(hi, k.h);
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null;

    const pad = (hi - lo) * 0.05;
    const yLo = lo - pad;
    const yHi = hi + pad;

    return { c, yLo, yHi };
  }, [candles]);

  if (!view) {
    return (
      <div
        className="rounded-2xl"
        style={{
          height,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      />
    );
  }

  const { c, yLo, yHi } = view;
  const w = 420;
  const h = height;
  const padX = 10;
  const padY = 10;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const xFor = (i: number) => padX + (i / Math.max(1, c.length - 1)) * innerW;
  const yFor = (p: number) => padY + (1 - clamp01((p - yLo) / (yHi - yLo))) * innerH;

  const bodyW = Math.max(2, Math.floor(innerW / c.length) - 2);

  // “Upcoming” visualization: scenario fan (illustrative only).
  const last = c[c.length - 1];
  const rangeAvg =
    c.slice(-14).reduce((s, k) => s + (k.h - k.l), 0) / Math.max(1, Math.min(14, c.length));
  const step = Number.isFinite(rangeAvg) && rangeAvg > 0 ? rangeAvg * 0.35 : (yHi - yLo) * 0.02;
  const px0 = last.c;
  const scenarios = [
    { label: "bear", v: px0 - step, col: "rgba(248,113,113,0.55)" },
    { label: "base", v: px0, col: "rgba(161,161,170,0.55)" },
    { label: "bull", v: px0 + step, col: "rgba(34,197,94,0.55)" },
  ];

  // Map fills onto visible candle range and show as small markers.
  const tMin = c[0].t * 1000;
  const tMax = c[c.length - 1].t * 1000;
  const fillsInRange = fills.filter((f) => f.atMs >= tMin && f.atMs <= tMax);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        preserveAspectRatio="none"
        style={{ display: "block", background: "rgba(255,255,255,0.02)" }}
      >
        {/* subtle grid */}
        {Array.from({ length: 4 }).map((_, i) => (
          <line
            key={i}
            x1={0}
            x2={w}
            y1={padY + (i / 3) * innerH}
            y2={padY + (i / 3) * innerH}
            stroke="rgba(255,255,255,0.03)"
            strokeWidth={1}
          />
        ))}

        {/* candles */}
        {c.map((k, i) => {
          const x = xFor(i);
          const up = k.c >= k.o;
          const col = up ? "rgba(34,197,94,0.85)" : "rgba(248,113,113,0.85)";
          const yO = yFor(k.o);
          const yC = yFor(k.c);
          const yH = yFor(k.h);
          const yL = yFor(k.l);
          const yTop = Math.min(yO, yC);
          const yBot = Math.max(yO, yC);
          return (
            <g key={k.t}>
              <line x1={x} x2={x} y1={yH} y2={yL} stroke={col} strokeWidth={1} />
              <rect
                x={x - bodyW / 2}
                y={yTop}
                width={bodyW}
                height={Math.max(2, yBot - yTop)}
                fill={col}
                opacity={0.35}
              />
            </g>
          );
        })}

        {/* scenario fan (dashed) */}
        {(() => {
          const x0 = xFor(c.length - 1);
          const x1 = x0 + Math.max(16, innerW / 10);
          const y0 = yFor(px0);
          return scenarios.map((s) => (
            <line
              key={s.label}
              x1={x0}
              x2={x1}
              y1={y0}
              y2={yFor(s.v)}
              stroke={s.col}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              opacity={0.9}
            />
          ));
        })()}

        {/* fill markers */}
        {fillsInRange.map((f) => {
          const u = (f.atMs - tMin) / Math.max(1, tMax - tMin);
          const x = padX + clamp01(u) * innerW;
          const y = yFor(f.price);
          const col = f.side === "buy" ? "rgba(34,197,94,0.95)" : "rgba(248,113,113,0.95)";
          return <circle key={f.atMs} cx={x} cy={y} r={3} fill={col} />;
        })}
      </svg>

      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{
          background: "rgba(0,0,0,0.18)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: 11,
          color: "#71717a",
        }}
      >
        <span className="font-mono">last 64 candles</span>
        <span className="font-mono">dashed = scenarios (illustrative)</span>
      </div>
    </div>
  );
}

