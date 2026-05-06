"use client";

import { motion } from "framer-motion";
import { CandlestickChart, Shield, Waves } from "lucide-react";
import type { MarketMode } from "./types";

export function TradeTopBar(props: {
  mode: MarketMode;
  setMode: (m: MarketMode) => void;
  paper: boolean;
  setPaper: (v: boolean) => void;
  symbol: string;
}) {
  const { mode, setMode, paper, setPaper, symbol } = props;

  return (
    <div
      className="sticky top-0 z-20 px-8 pt-8 pb-4"
      style={{
        background: "linear-gradient(180deg, rgba(8,11,20,1) 0%, rgba(8,11,20,0.92) 60%, rgba(8,11,20,0) 100%)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <CandlestickChart size={18} color="#34d399" strokeWidth={1.6} />
            <h1 className="font-extrabold tracking-tight" style={{ fontSize: 20, color: "#fafafa" }}>
              Trade
            </h1>
            <span className="ml-1 font-mono" style={{ fontSize: 11, color: "#3f3f46" }}>
              {symbol || "—"}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#52525b", marginTop: 2 }}>
            Wisp is the new god.
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Spot / Perps */}
          <div
            className="flex items-center rounded-xl p-1"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            role="tablist"
            aria-label="Market mode"
          >
            {(["spot", "perps"] as MarketMode[]).map((m) => {
              const active = mode === m;
              return (
                <motion.button
                  key={m}
                  onClick={() => setMode(m)}
                  className="relative px-3.5 py-2 rounded-lg text-xs font-semibold"
                  style={{ color: active ? "#0b0d1a" : "#a1a1aa" }}
                  whileTap={{ scale: 0.98 }}
                  aria-selected={active}
                  role="tab"
                >
                  {active && (
                    <motion.div
                      layoutId="mode-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: m === "spot" ? "rgba(56,189,248,0.95)" : "rgba(167,139,250,0.95)",
                      }}
                      transition={{ type: "spring", stiffness: 450, damping: 34 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    {m === "spot" ? <Waves size={13} /> : <Shield size={13} />}
                    {m === "spot" ? "Spot" : "Perps"}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Paper toggle */}
          <motion.button
            onClick={() => setPaper(!paper)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold"
            style={{
              background: paper ? "rgba(52,211,153,0.14)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${paper ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.06)"}`,
              color: paper ? "#34d399" : "#a1a1aa",
            }}
            whileHover={{ background: paper ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.06)" }}
            whileTap={{ scale: 0.98 }}
            aria-pressed={paper}
          >
            Wisp Trade
          </motion.button>
        </div>
      </div>
    </div>
  );
}

