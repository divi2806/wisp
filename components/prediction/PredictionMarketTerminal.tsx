"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Clock3,
  RefreshCw,
  RotateCcw,
  Signal,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { CandlesChart } from "@/components/trade/CandlesChart";
import { usePredictionMarkets } from "@/components/prediction/usePredictionMarkets";
import { usePredictionPaper } from "@/components/prediction/usePredictionPaper";
import { WispPredictionChat } from "@/components/prediction/WispPredictionChat";
import type { PolymarketReference, PredictionAction, PredictionMarket, PredictionSide } from "@/components/prediction/types";

function money(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: value < 10 ? Math.min(digits, 3) : 0 })}`;
}

function price(value: number | null | undefined, asset?: string) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return asset === "BTC"
    ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function odds(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return `$${value.toFixed(3)}`;
}

function pct(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function compact(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

function timer(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function sidePrice(market: PredictionMarket, side: PredictionSide) {
  return side === "yes" ? market.yesPrice : market.noPrice;
}

function activePositionValue(market: PredictionMarket, side: PredictionSide, shares: number) {
  return shares * sidePrice(market, side);
}

function statusTone(status: string) {
  if (status === "live") return { label: "Live", color: "#22c55e", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.22)" };
  if (status === "connecting") return { label: "Connecting", color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.22)" };
  if (status === "error") return { label: "Socket error", color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.22)" };
  return { label: "Stale", color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.22)" };
}

function MarketCard(props: {
  market: PredictionMarket;
  active: boolean;
  onClick: () => void;
}) {
  const { market, active, onClick } = props;
  const tone = market.yesProbability >= 0.5 ? "#22c55e" : "#fb7185";
  return (
    <button
      onClick={onClick}
      className="min-h-[124px] rounded-2xl border p-4 text-left shadow-[0_18px_46px_rgba(0,0,0,0.20)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      style={{
        background: active ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.025)",
        borderColor: active ? "rgba(125,211,252,0.36)" : "rgba(255,255,255,0.07)",
        boxShadow: active ? "0 22px 60px rgba(8,145,178,0.12)" : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-zinc-100">{market.label}</p>
          <p className="mt-1 text-xs text-zinc-500">{market.durationMinutes}m rolling binary</p>
        </div>
        <span
          className="shrink-0 rounded-full border px-2 py-1 font-mono text-[11px]"
          style={{ color: statusTone(market.wsStatus).color, borderColor: statusTone(market.wsStatus).border, background: statusTone(market.wsStatus).bg }}
        >
          {timer(market.timeRemainingMs)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.055] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/70">YES</p>
          <p className="mt-1 font-mono text-lg font-bold text-emerald-300">{odds(market.yesPrice)}</p>
        </div>
        <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.055] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300/70">NO</p>
          <p className="mt-1 font-mono text-lg font-bold text-rose-300">{odds(market.noPrice)}</p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: tone, width: `${market.yesProbability * 100}%` }}
          transition={{ duration: 0.15 }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="font-mono text-zinc-500">{price(market.livePrice, market.asset)}</span>
        <span className="font-mono" style={{ color: (market.changePct ?? 0) >= 0 ? "#22c55e" : "#fb7185" }}>{pct(market.changePct)}</span>
      </div>
    </button>
  );
}

function OrderTicket(props: {
  market: PredictionMarket;
  cashUSDC: number;
  yesShares: number;
  noShares: number;
  onSubmit: (args: { side: PredictionSide; action: PredictionAction; shares: number }) => void;
  onReset: () => void;
}) {
  const { market, cashUSDC, yesShares, noShares, onSubmit, onReset } = props;
  const [side, setSide] = useState<PredictionSide>("yes");
  const [action, setAction] = useState<PredictionAction>("buy");
  const [shares, setShares] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentPrice = sidePrice(market, side);
  const shareAmount = Number(shares);
  const notional = Number.isFinite(shareAmount) && shareAmount > 0 ? shareAmount * currentPrice : 0;
  const maxPayout = Number.isFinite(shareAmount) && shareAmount > 0 ? shareAmount : 0;
  const maxProfit = maxPayout - notional;
  const heldShares = side === "yes" ? yesShares : noShares;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErr(null);
    try {
      onSubmit({ side, action, shares: Number(shares) });
      setShares("");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Order failed.");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#0b1020]/95 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-zinc-100">Paper Ticket</p>
          <p className="mt-1 text-xs text-zinc-500">Binary shares settle at $1 / $0</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex h-10 items-center gap-1.5 rounded-xl border border-white/[0.06] px-3 text-xs font-semibold text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4 p-4">
        <fieldset>
          <legend className="sr-only">Prediction side</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["yes", "no"] as const).map((item) => {
              const active = side === item;
              const color = item === "yes" ? "#22c55e" : "#fb7185";
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSide(item)}
                  className="h-12 rounded-xl border text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-cyan-300"
                  style={{
                    background: active ? `${color}24` : "rgba(255,255,255,0.03)",
                    borderColor: active ? `${color}66` : "rgba(255,255,255,0.07)",
                    color: active ? color : "#a1a1aa",
                  }}
                >
                  {item.toUpperCase()} {odds(sidePrice(market, item))}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="sr-only">Order action</legend>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
            {(["buy", "sell"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setAction(item)}
                className="h-10 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-cyan-300"
                style={{
                  background: action === item ? "rgba(255,255,255,0.10)" : "transparent",
                  color: action === item ? "#fafafa" : "#71717a",
                }}
              >
                {item === "buy" ? "Buy shares" : "Sell held"}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="prediction-shares" className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            Shares
          </label>
          <input
            ref={inputRef}
            id="prediction-shares"
            value={shares}
            onChange={(event) => setShares(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={err ? "true" : undefined}
            aria-describedby={err ? "prediction-order-error" : undefined}
            placeholder="10"
            className="h-11 w-full rounded-xl border border-white/[0.08] bg-transparent px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus-visible:ring-2 focus-visible:ring-cyan-300"
          />
          <div className="mt-2 flex gap-2">
            {[5, 10, 25, 50].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setShares(String(amount))}
                className="h-9 rounded-lg border border-white/[0.06] px-3 font-mono text-xs text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Price</span>
            <span className="font-mono text-zinc-300">{odds(currentPrice)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">{action === "buy" ? "Cost" : "Proceeds"}</span>
            <span className="font-mono text-zinc-300">{money(notional, 3)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Max payout</span>
            <span className="font-mono text-zinc-300">{money(maxPayout, 2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Max profit</span>
            <span className="font-mono text-emerald-300">{money(maxProfit, 2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Paper cash</span>
            <span className="font-mono text-zinc-300">{money(cashUSDC, 2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Held {side.toUpperCase()}</span>
            <span className="font-mono text-zinc-300">{heldShares.toFixed(2)}</span>
          </div>
        </div>

        {err && (
          <div id="prediction-order-error" className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-300" />
            <p className="text-xs leading-relaxed text-rose-200">{err}</p>
          </div>
        )}

        <button
          type="submit"
          className="h-12 w-full rounded-xl border text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!market.startPrice || !market.livePrice || market.timeRemainingMs <= 0}
          style={{
            background: side === "yes" ? "rgba(34,197,94,0.16)" : "rgba(251,113,133,0.14)",
            borderColor: side === "yes" ? "rgba(34,197,94,0.28)" : "rgba(251,113,133,0.26)",
            color: side === "yes" ? "#22c55e" : "#fb7185",
          }}
        >
          {action === "buy" ? "Buy" : "Sell"} {side.toUpperCase()}
        </button>
      </form>
    </section>
  );
}

function PositionsPanel(props: {
  market: PredictionMarket;
  positions: ReturnType<typeof usePredictionPaper>["state"]["positions"];
  fills: ReturnType<typeof usePredictionPaper>["state"]["fills"];
  settlements: ReturnType<typeof usePredictionPaper>["state"]["settlements"];
  clearHistory: () => void;
}) {
  const { market, positions, fills, settlements, clearHistory } = props;
  const openPositions = positions.slice(0, 8);
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#0b1020]/95 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-zinc-100">Positions</p>
          <p className="mt-1 text-xs text-zinc-500">{openPositions.length} open · {settlements.length} settled</p>
        </div>
        {(fills.length > 0 || settlements.length > 0) && (
          <button
            type="button"
            onClick={clearHistory}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-white/[0.06] px-3 text-xs font-semibold text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {openPositions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-semibold text-zinc-300">No paper shares yet</p>
            <p className="mx-auto mt-2 max-w-[280px] text-xs leading-relaxed text-zinc-500">
              Pick YES or NO, buy a few shares, then watch the window settle at the timer.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {openPositions.map((position) => {
              const currentMarket = position.contractId === market.contractId ? market : null;
              const mark = currentMarket ? sidePrice(currentMarket, position.side) : null;
              const value = mark ? position.shares * mark : null;
              const pnl = value === null ? null : value - position.shares * position.avgPrice;
              return (
                <div key={position.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-200">{position.asset} {position.durationMinutes}m {position.side.toUpperCase()}</p>
                      <p className="mt-1 truncate font-mono text-[10px] text-zinc-600">{position.contractId}</p>
                    </div>
                    <span className="rounded-lg border border-white/[0.06] px-2 py-1 font-mono text-[11px] text-zinc-400">{position.shares.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <p className="text-zinc-600">Avg</p>
                      <p className="font-mono text-zinc-300">{odds(position.avgPrice)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-600">Mark</p>
                      <p className="font-mono text-zinc-300">{mark ? odds(mark) : "--"}</p>
                    </div>
                    <div>
                      <p className="text-zinc-600">PnL</p>
                      <p className="font-mono" style={{ color: (pnl ?? 0) >= 0 ? "#22c55e" : "#fb7185" }}>{pnl === null ? "--" : money(pnl, 2)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(fills.length > 0 || settlements.length > 0) && (
          <div className="border-t border-white/[0.05] px-4 py-3">
            <p className="mb-2 text-xs font-semibold text-zinc-100">Recent tape</p>
            <div className="space-y-2">
              {settlements.slice(0, 3).map((settlement) => (
                <div key={settlement.id} className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-300">SETTLED {settlement.asset} {settlement.durationMinutes}m</span>
                    <span className="font-mono" style={{ color: settlement.pnl >= 0 ? "#22c55e" : "#fb7185" }}>{money(settlement.pnl, 2)}</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-zinc-600">Outcome {settlement.outcome.toUpperCase()} · final {price(settlement.finalPrice, settlement.asset)}</p>
                </div>
              ))}
              {fills.slice(0, 5).map((fill) => (
                <div key={fill.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs">
                  <span className="font-semibold" style={{ color: fill.side === "yes" ? "#22c55e" : "#fb7185" }}>
                    {fill.action.toUpperCase()} {fill.side.toUpperCase()} · {fill.asset} {fill.durationMinutes}m
                  </span>
                  <span className="font-mono text-zinc-400">{fill.shares.toFixed(2)} @ {odds(fill.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PolymarketPanel(props: {
  asset: string;
  references: PolymarketReference[];
  warning: string | null;
  loading: boolean;
}) {
  const { asset, references, warning, loading } = props;
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#0b1020]/95 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-4">
        <Sparkles size={15} className="text-rose-300" />
        <div>
          <p className="text-sm font-semibold text-zinc-100">Polymarket reference</p>
          <p className="mt-1 text-xs text-zinc-500">{asset} related live markets when available</p>
        </div>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : warning ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.08] px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
            <p className="text-xs leading-relaxed text-amber-100">{warning}</p>
          </div>
        ) : references.length === 0 ? (
          <p className="text-xs leading-relaxed text-zinc-500">
            No clean related live Polymarket markets returned. Wisp paper markets still run from Binance realtime prices.
          </p>
        ) : (
          <div className="space-y-2">
            {references.slice(0, 3).map((reference) => (
              <div key={reference.id} className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-zinc-300">{reference.question}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-zinc-600">
                  <span>Liq {compact(reference.liquidity)}</span>
                  <span>Vol {compact(reference.volume)}</span>
                  {reference.outcomePrices.slice(0, 2).map((value, idx) => (
                    <span key={idx}>{reference.outcomes[idx] ?? idx + 1}: {odds(value)}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function PredictionMarketTerminal() {
  const { markets, loading, error, wsStatus, refreshHistory } = usePredictionMarkets();
  const [activeKey, setActiveKey] = useState("btc-5m");
  const activeMarket = markets.find((market) => market.key === activeKey) ?? markets[0];
  const paper = usePredictionPaper(markets);
  const [references, setReferences] = useState<PolymarketReference[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsWarning, setRefsWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!activeMarket) return;
    let cancelled = false;
    setRefsLoading(true);
    setRefsWarning(null);
    fetch(`/api/prediction/polymarket?asset=${activeMarket.asset}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { references?: PolymarketReference[]; warning?: string }) => {
        if (cancelled) return;
        setReferences(json.references ?? []);
        setRefsWarning(json.warning ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setReferences([]);
          setRefsWarning("Could not load Polymarket reference markets.");
        }
      })
      .finally(() => {
        if (!cancelled) setRefsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMarket?.asset]);

  const activeYes = activeMarket ? paper.positionsByKey.get(`${activeMarket.contractId}:yes`) : undefined;
  const activeNo = activeMarket ? paper.positionsByKey.get(`${activeMarket.contractId}:no`) : undefined;
  const status = statusTone(activeMarket?.wsStatus ?? wsStatus);
  const lastMoveUp =
    activeMarket?.livePrice !== null &&
    activeMarket?.previousPrice !== null &&
    activeMarket?.livePrice !== undefined &&
    activeMarket?.previousPrice !== undefined
      ? activeMarket.livePrice >= activeMarket.previousPrice
      : true;

  if (!activeMarket) {
    return (
      <div className="flex min-h-[520px] items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-2xl border border-white/[0.06] bg-[#0d1020] p-8 text-center">
          <p className="text-sm font-semibold text-zinc-200">Loading prediction markets</p>
          <p className="mt-2 text-xs text-zinc-500">Fetching BTC/SOL futures candles and opening the rolling books.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-native-scroll
      className="h-full min-h-0 overflow-y-auto overscroll-contain bg-[#080b14]"
      style={{
        scrollbarWidth: "thin",
        WebkitOverflowScrolling: "touch",
        background: "linear-gradient(180deg, #080b14 0%, #090d18 46%, #080b14 100%)",
      }}
    >
      <div className="mx-auto max-w-[1500px] px-5 pb-12 pt-6 lg:px-7">
        <section className="mb-5 rounded-2xl border border-white/[0.07] bg-[#0b1020]/95 px-5 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.28)] lg:pr-44">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/10">
                  <TrendingUp size={17} className="text-rose-300" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-extrabold tracking-tight text-zinc-50">Prediction Market</h1>
                  <p className="mt-1 text-sm text-zinc-500">Paper trade rolling BTC/SOL 5m and 15m binary markets.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs xl:justify-end">
              <span
                className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 font-semibold"
                style={{ color: status.color, background: status.bg, borderColor: status.border }}
              >
                <Signal size={13} />
                Binance WS {status.label}
              </span>
              <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 font-mono text-zinc-500">
                <Clock3 size={13} />
                {timer(activeMarket.timeRemainingMs)} left
              </span>
              <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 font-mono text-zinc-500">
                Paper USDC {money(paper.state.cashUSDC)}
              </span>
              <button
                type="button"
                onClick={() => void refreshHistory()}
                className="flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-300" />
            <div>
              <p className="text-sm font-semibold text-rose-100">Market history failed</p>
              <p className="mt-1 text-xs text-rose-200/80">{error}</p>
            </div>
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {markets.map((market) => (
            <MarketCard key={market.key} market={market} active={market.key === activeMarket.key} onClick={() => setActiveKey(market.key)} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b1020]/95 shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">Active market</p>
                    <h2 className="mt-1 text-xl font-bold leading-tight text-zinc-50">{activeMarket.question}</h2>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <span className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 font-mono text-zinc-500">Open <span className="text-zinc-300">{price(activeMarket.startPrice, activeMarket.asset)}</span></span>
                      <span className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 font-mono text-zinc-500">Live <span className={lastMoveUp ? "text-emerald-300" : "text-rose-300"}>{price(activeMarket.livePrice, activeMarket.asset)}</span></span>
                      <span className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 font-mono text-zinc-500">Distance <span className={(activeMarket.distanceUsd ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}>{money(activeMarket.distanceUsd, activeMarket.asset === "BTC" ? 1 : 4)}</span></span>
                      <span className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 font-mono text-zinc-500">Move <span className={(activeMarket.changePct ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}>{pct(activeMarket.changePct)}</span></span>
                    </div>
                  </div>

                  <div className="grid min-w-[280px] grid-cols-2 gap-2">
                    <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.055] px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/70">YES mark</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-emerald-300">{odds(activeMarket.yesPrice)}</p>
                    </div>
                    <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.055] px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-300/70">NO mark</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-rose-300">{odds(activeMarket.noPrice)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-300"
                    style={{ width: `${activeMarket.progressPct}%` }}
                    transition={{ duration: 0.15 }}
                  />
                </div>
              </div>

              {loading && activeMarket.candles.length === 0 ? (
                <div className="flex h-[520px] items-center justify-center">
                  <div className="text-center">
                    <Activity size={22} className="mx-auto animate-pulse text-zinc-600" />
                    <p className="mt-3 text-sm font-semibold text-zinc-300">Loading Binance candles</p>
                    <p className="mt-1 text-xs text-zinc-600">Opening realtime paper book</p>
                  </div>
                </div>
              ) : (
                <div className="px-2 pb-2 pt-3">
                  <CandlesChart
                    candles={activeMarket.candles}
                    height={520}
                    livePrice={activeMarket.livePrice}
                    symbol={activeMarket.contractId}
                    referencePrice={{
                      price: activeMarket.startPrice,
                      title: "open",
                      color: "#fbbf24",
                    }}
                  />
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.07] bg-[#0b1020]/95 p-4 shadow-[0_16px_42px_rgba(0,0,0,0.20)]">
                <div className="mb-3 flex items-center gap-2">
                  <Wallet size={15} className="text-cyan-300" />
                  <p className="text-sm font-semibold text-zinc-100">Account</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between"><span className="text-zinc-500">Cash</span><span className="font-mono text-zinc-300">{money(paper.state.cashUSDC)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-zinc-500">Portfolio value</span><span className="font-mono text-zinc-300">{money(paper.portfolioValue)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-zinc-500">Open positions</span><span className="font-mono text-zinc-300">{paper.state.positions.length}</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-[#0b1020]/95 p-4 shadow-[0_16px_42px_rgba(0,0,0,0.20)]">
                <div className="mb-3 flex items-center gap-2">
                  <ArrowUp size={15} className="text-emerald-300" />
                  <p className="text-sm font-semibold text-zinc-100">YES exposure</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between"><span className="text-zinc-500">Shares</span><span className="font-mono text-zinc-300">{(activeYes?.shares ?? 0).toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-zinc-500">Avg</span><span className="font-mono text-zinc-300">{activeYes ? odds(activeYes.avgPrice) : "--"}</span></div>
                  <div className="flex items-center justify-between"><span className="text-zinc-500">Mark value</span><span className="font-mono text-zinc-300">{money(activePositionValue(activeMarket, "yes", activeYes?.shares ?? 0))}</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-[#0b1020]/95 p-4 shadow-[0_16px_42px_rgba(0,0,0,0.20)]">
                <div className="mb-3 flex items-center gap-2">
                  <ArrowDown size={15} className="text-rose-300" />
                  <p className="text-sm font-semibold text-zinc-100">NO exposure</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between"><span className="text-zinc-500">Shares</span><span className="font-mono text-zinc-300">{(activeNo?.shares ?? 0).toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-zinc-500">Avg</span><span className="font-mono text-zinc-300">{activeNo ? odds(activeNo.avgPrice) : "--"}</span></div>
                  <div className="flex items-center justify-between"><span className="text-zinc-500">Mark value</span><span className="font-mono text-zinc-300">{money(activePositionValue(activeMarket, "no", activeNo?.shares ?? 0))}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <OrderTicket
              market={activeMarket}
              cashUSDC={paper.state.cashUSDC}
              yesShares={activeYes?.shares ?? 0}
              noShares={activeNo?.shares ?? 0}
              onSubmit={({ side, action, shares }) => paper.placeOrder({ market: activeMarket, side, action, shares })}
              onReset={paper.reset}
            />
            <PositionsPanel
              market={activeMarket}
              positions={paper.state.positions}
              fills={paper.state.fills}
              settlements={paper.state.settlements}
              clearHistory={paper.clearHistory}
            />
            <PolymarketPanel
              asset={activeMarket.asset}
              references={references}
              warning={refsWarning}
              loading={refsLoading}
            />
          </div>
        </div>
      </div>

      <WispPredictionChat
        market={activeMarket}
        markets={markets}
        paper={paper.state}
        portfolioValue={paper.portfolioValue}
        references={references}
      />
    </div>
  );
}
