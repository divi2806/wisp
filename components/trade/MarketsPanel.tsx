"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { MarketMode, Ticker24h } from "./types";

function fmtPct(p: number) {
  const s = p.toFixed(2);
  return `${p >= 0 ? "+" : ""}${s}%`;
}

function fmtPrice(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (n >= 1000)  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 10)    return n.toFixed(3);
  if (n >= 1)     return n.toFixed(4);
  if (n >= 0.01)  return n.toFixed(6);
  if (n >= 0.001) return n.toFixed(7);
  return n.toPrecision(5);
}

function fmtVol(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function MarketsPanel(props: {
  mode: MarketMode;
  tickers: Ticker24h[] | null;
  activeSymbol: string;
  onPick: (symbol: string) => void;
  error?: string | null;
  maxHeight?: number;
}) {
  const { tickers, activeSymbol, onPick, error, maxHeight = 380 } = props;
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toUpperCase();
    const list = tickers ?? [];
    if (!query) return list;
    return list.filter(
      (t) => t.symbol.includes(query) || t.name.toUpperCase().includes(query)
    );
  }, [tickers, q]);

  return (
    <section
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.06)" }}
      aria-label="Markets"
    >
      {/* Header (sticky) */}
      <div
        className="px-4 pt-4 pb-3 flex items-center justify-between gap-3 sticky top-0 z-10"
        style={{
          background: "linear-gradient(180deg, rgba(13,16,32,0.98) 0%, rgba(13,16,32,0.92) 70%, rgba(13,16,32,0.75) 100%)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="min-w-0">
          <p className="font-semibold" style={{ fontSize: 12, color: "#e4e4e7" }}>
            Markets
          </p>
          <p style={{ fontSize: 10, color: "#3f3f46", marginTop: 2 }}>
            {tickers ? `${tickers.length} Solana tokens · live DEX prices` : "Loading…"}
          </p>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" color="#3f3f46" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or ticker…"
            className="pl-8 pr-3 py-2 rounded-xl text-xs bg-transparent outline-none"
            style={{ width: 190, border: "1px solid rgba(255,255,255,0.08)", color: "#e4e4e7" }}
          />
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight }}>
        {/* Column headers (sticky inside scroller) */}
        <div
          className="px-4 py-2 grid text-[10px] uppercase tracking-wider font-bold sticky top-0 z-[5]"
          style={{
            color: "#3f3f46",
            gridTemplateColumns: "1fr 90px 70px 56px",
            background: "rgba(13,16,32,0.92)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span>Token</span>
          <span className="text-right">Price</span>
          <span className="text-right">24h Vol</span>
          <span className="text-right">24h %</span>
        </div>

        {error ? (
          <div className="px-4 py-4 text-xs" style={{ color: "#f87171" }}>{error}</div>
        ) : !tickers ? (
          <div className="px-4 py-4 text-xs" style={{ color: "#52525b" }}>Loading markets…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-4 text-xs" style={{ color: "#52525b" }}>No matches.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
            {filtered.map((t) => {
              const active = t.symbol === activeSymbol;
              const pct = Number(t.priceChangePercent);
              const pctColor = pct >= 0 ? "#22c55e" : "#f87171";
              return (
                <button
                  key={t.symbol}
                  onClick={() => onPick(t.symbol)}
                  className="w-full px-4 py-2.5 grid items-center text-left transition-colors"
                  style={{
                    gridTemplateColumns: "1fr 90px 70px 56px",
                    background: active ? "rgba(139,92,246,0.10)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (active) return;
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    if (active) return;
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Token name + ticker */}
                  <div className="min-w-0 pr-2">
                    <p
                      className="font-semibold text-xs truncate"
                      style={{ color: active ? "#c4b5fd" : "#e4e4e7" }}
                    >
                      {t.symbol}
                    </p>
                    <p
                      className="truncate"
                      style={{ fontSize: 10, color: active ? "#a78bfa" : "#3f3f46", marginTop: 1 }}
                    >
                      {t.name}
                    </p>
                  </div>

                  {/* Price */}
                  <p
                    className="text-right font-mono text-xs"
                    style={{ color: active ? "#e4e4e7" : "#a1a1aa" }}
                  >
                    {fmtPrice(t.lastPrice)}
                  </p>

                  {/* 24h Volume */}
                  <p className="text-right font-mono" style={{ fontSize: 10, color: "#52525b" }}>
                    {fmtVol(t.volume)}
                  </p>

                  {/* 24h % */}
                  <p className="text-right font-mono text-xs font-semibold" style={{ color: pctColor }}>
                    {Number.isFinite(pct) ? fmtPct(pct) : "—"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
