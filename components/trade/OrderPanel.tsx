"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import type { MarketMode, Ticker24h } from "./types";
import { usePaperTrade } from "./usePaperTrade";

function fmt(n: number, d = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: d });
}

export function OrderPanel(props: {
  mode: MarketMode;
  paper: boolean;
  symbol: string;
  ticker: Ticker24h | undefined;
  side?: "buy" | "sell";
  setSide?: (s: "buy" | "sell") => void;
}) {
  const { paper, symbol, ticker, mode } = props;
  const paperAcct = usePaperTrade(paper);
  const [localSide, setLocalSide] = useState<"buy" | "sell">("buy");
  const side = props.side ?? localSide;
  const setSide = props.setSide ?? setLocalSide;

  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [qty, setQty] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const last = Number(ticker?.lastPrice ?? "0");
  const px = orderType === "limit" ? Number(limitPrice || "0") : last;
  const notional = useMemo(() => {
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(px) || px <= 0) return 0;
    return q * px;
  }, [qty, px]);

  const position = paperAcct.posBySymbol.get(symbol) ?? 0;
  const avgEntry = useMemo(() => {
    if (!paper || !symbol) return null;
    let qtySum = 0;
    let cost = 0;
    for (const f of paperAcct.state.fills) {
      if (f.symbol !== symbol) continue;
      if (f.side === "buy") {
        qtySum += f.qty;
        cost += f.qty * f.price;
      } else {
        // reduce position cost basis naively on sells (FIFO not tracked here)
        qtySum -= f.qty;
        cost -= f.qty * (cost / Math.max(qtySum + f.qty, 1e-9));
      }
    }
    if (!Number.isFinite(qtySum) || Math.abs(qtySum) < 1e-9) return null;
    if (!Number.isFinite(cost)) return null;
    return cost / qtySum;
  }, [paper, symbol, paperAcct.state.fills]);

  const unrealized = useMemo(() => {
    if (!paper || !symbol) return null;
    // No open position → PnL is zero (not unknown)
    if (!Number.isFinite(position) || Math.abs(position) < 1e-9) return 0;
    if (!Number.isFinite(last) || last <= 0) return null;
    if (!avgEntry || !Number.isFinite(avgEntry)) return null;
    return (last - avgEntry) * position;
  }, [paper, symbol, last, avgEntry, position]);

  const submit = () => {
    setErr(null);
    try {
      if (!paper) throw new Error("Enable Paper trade to place orders.");
      if (!symbol) throw new Error("Pick a market first.");
      if (!Number.isFinite(last) || last <= 0) throw new Error("Price unavailable.");
      if (orderType === "market") {
        paperAcct.placeMarket({ symbol, side, qty: Number(qty), price: last });
      } else {
        const lp = Number(limitPrice);
        if (!Number.isFinite(lp) || lp <= 0) throw new Error("Enter a valid limit price.");
        paperAcct.placeLimit({ symbol, side, qty: Number(qty), limitPrice: lp });
      }
      setQty("");
      setLimitPrice("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <section
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.06)" }}
      aria-label="Order entry"
    >
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-semibold" style={{ fontSize: 12, color: "#e4e4e7" }}>
            Order
          </p>
          <p style={{ fontSize: 10, color: "#3f3f46", marginTop: 2 }}>
            {mode === "spot" ? "Spot" : "Perps"} · {orderType === "market" ? "Market" : "Limit"}
          </p>
        </div>
        {paper && (
          <motion.button
            onClick={paperAcct.reset}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold"
            style={{ color: "#3f3f46", border: "1px solid rgba(255,255,255,0.06)" }}
            whileHover={{ background: "rgba(255,255,255,0.04)", color: "#a1a1aa" }}
            whileTap={{ scale: 0.98 }}
            title="Reset paper account"
          >
            <RotateCcw size={14} />
            Reset
          </motion.button>
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Order type */}
        <div
          className="flex items-center rounded-xl p-1 mb-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {(["market", "limit"] as const).map((t) => {
            const active = orderType === t;
            return (
              <motion.button
                key={t}
                onClick={() => setOrderType(t)}
                className="relative flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ color: active ? "#0b0d1a" : "#a1a1aa" }}
                whileTap={{ scale: 0.98 }}
              >
                {active && (
                  <motion.div
                    layoutId="type-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: "rgba(56,189,248,0.95)" }}
                    transition={{ type: "spring", stiffness: 450, damping: 34 }}
                  />
                )}
                <span className="relative">{t === "market" ? "Market" : "Limit"}</span>
              </motion.button>
            );
          })}
        </div>

        <div
          className="flex items-center rounded-xl p-1 mb-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {(["buy", "sell"] as const).map((s) => {
            const active = side === s;
            const accent = s === "buy" ? "#22c55e" : "#f87171";
            return (
              <motion.button
                key={s}
                onClick={() => setSide(s)}
                className="relative flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ color: active ? "#0b0d1a" : "#a1a1aa" }}
                whileTap={{ scale: 0.98 }}
              >
                {active && (
                  <motion.div
                    layoutId="side-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: `${accent}` }}
                    transition={{ type: "spring", stiffness: 450, damping: 34 }}
                  />
                )}
                <span className="relative">{s === "buy" ? "Buy" : "Sell"}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="space-y-2.5">
          {orderType === "limit" && (
            <div>
              <label
                className="block mb-1"
                style={{
                  fontSize: 10,
                  color: "#3f3f46",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Limit price
              </label>
              <input
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                inputMode="decimal"
                placeholder={Number.isFinite(last) && last > 0 ? String(last) : "0.0"}
                className="w-full px-3 py-2.5 rounded-xl bg-transparent outline-none text-sm"
                style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#e4e4e7" }}
              />
            </div>
          )}
          <div>
            <label className="block mb-1" style={{ fontSize: 10, color: "#3f3f46", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Quantity
            </label>
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="decimal"
              placeholder="0.0"
              className="w-full px-3 py-2.5 rounded-xl bg-transparent outline-none text-sm"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#e4e4e7" }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span style={{ color: "#52525b" }}>Est. notional</span>
            <span className="font-mono" style={{ color: "#a1a1aa" }}>
              {fmt(notional, 2)} USDT
            </span>
          </div>

          {paper && (
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "#52525b" }}>Paper balance</span>
              <span className="font-mono" style={{ color: "#a1a1aa" }}>
                {fmt(paperAcct.state.cashUSDT, 2)} USDT
              </span>
            </div>
          )}

          {paper && symbol && (
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "#52525b" }}>Position</span>
              <span className="font-mono" style={{ color: position >= 0 ? "#22c55e" : "#f87171" }}>
                {fmt(position, 6)}
              </span>
            </div>
          )}

          {paper && symbol && (
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "#52525b" }}>Unrealized PnL</span>
              <span className="font-mono" style={{ color: (unrealized ?? 0) >= 0 ? "#22c55e" : "#f87171" }}>
                {unrealized === null ? "—" : `${unrealized >= 0 ? "+" : ""}${fmt(unrealized, 2)} USDT`}
              </span>
            </div>
          )}
        </div>

        {err && (
          <div className="mt-3 flex items-start gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.16)" }}>
            <AlertTriangle size={14} color="#f87171" style={{ marginTop: 1 }} />
            <p style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.45 }}>{err}</p>
          </div>
        )}

        <motion.button
          onClick={submit}
          className="mt-4 w-full h-11 rounded-xl text-sm font-semibold"
          style={{
            background: side === "buy" ? "rgba(34,197,94,0.18)" : "rgba(248,113,113,0.14)",
            border: `1px solid ${side === "buy" ? "rgba(34,197,94,0.28)" : "rgba(248,113,113,0.24)"}`,
            color: side === "buy" ? "#22c55e" : "#f87171",
          }}
          whileHover={{ background: side === "buy" ? "rgba(34,197,94,0.24)" : "rgba(248,113,113,0.18)" }}
          whileTap={{ scale: 0.99 }}
        >
          {paper
            ? `${side === "buy" ? "Buy" : "Sell"} ${orderType === "limit" ? "Limit" : ""}`.trim()
            : "Enable Paper trade"}
        </motion.button>

        {!paper && (
          <p className="mt-2 text-center" style={{ fontSize: 10, color: "#3f3f46" }}>
            Live execution is not enabled yet. Paper trade uses real market prices.
          </p>
        )}
      </div>

      {paper && (
        <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {/* Open orders */}
          {paperAcct.state.openOrders.length > 0 && (
            <div className="px-4 pt-3">
              <p className="font-semibold mb-2" style={{ fontSize: 12, color: "#e4e4e7" }}>
                Open orders
              </p>
              <div className="space-y-2">
                {paperAcct.state.openOrders.slice(0, 6).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold" style={{ color: o.side === "buy" ? "#22c55e" : "#f87171" }}>
                        {o.side.toUpperCase()} LIMIT
                      </p>
                      <p className="font-mono truncate" style={{ fontSize: 10, color: "#3f3f46" }}>
                        {o.symbol} · {fmt(o.qty, 6)} @ {fmt(Number(o.limitPrice ?? 0), 6)}
                      </p>
                    </div>
                    <motion.button
                      onClick={() => paperAcct.cancelOrder(o.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ color: "#3f3f46", border: "1px solid rgba(255,255,255,0.06)" }}
                      whileHover={{ background: "rgba(255,255,255,0.04)", color: "#a1a1aa" }}
                      whileTap={{ scale: 0.98 }}
                      title="Cancel order"
                    >
                      <X size={14} />
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-3 flex items-center justify-between">
            <p className="font-semibold" style={{ fontSize: 12, color: "#e4e4e7" }}>
              Fills
            </p>
            <span className="font-mono" style={{ fontSize: 10, color: "#3f3f46" }}>
              {paperAcct.state.fills.length}
            </span>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {paperAcct.state.fills.length === 0 ? (
              <div className="px-4 pb-4 text-xs" style={{ color: "#52525b" }}>
                No fills yet.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {paperAcct.state.fills.slice(0, 30).map((f) => (
                  <div key={f.id} className="px-4 py-2.5 grid grid-cols-3 items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold" style={{ color: f.side === "buy" ? "#22c55e" : "#f87171" }}>
                        {f.side.toUpperCase()}
                      </p>
                      <p className="font-mono truncate" style={{ fontSize: 10, color: "#3f3f46" }}>
                        {f.symbol}
                      </p>
                    </div>
                    <p className="text-right font-mono text-xs" style={{ color: "#a1a1aa" }}>
                      {fmt(f.qty, 6)}
                    </p>
                    <p className="text-right font-mono text-xs" style={{ color: "#a1a1aa" }}>
                      {fmt(f.price, 6)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

