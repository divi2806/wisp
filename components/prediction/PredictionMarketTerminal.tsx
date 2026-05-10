"use client";

import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bitcoin,
  BriefcaseBusiness,
  ChartSpline,
  CircleDollarSign,
  Expand,
  History,
  MoreVertical,
  PieChart,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Signal,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { CandlesChart } from "@/components/trade/CandlesChart";
import { usePredictionMarkets } from "@/components/prediction/usePredictionMarkets";
import { usePredictionPaper } from "@/components/prediction/usePredictionPaper";
import { WispPredictionChat } from "@/components/prediction/WispPredictionChat";
import type { PolymarketReference, PredictionAction, PredictionMarket, PredictionSide } from "@/components/prediction/types";

type SurfaceVars = CSSProperties & Record<`--${string}`, string>;

const pmSurfaceVars: SurfaceVars = {
  "--pm-bg": "#040914",
  "--pm-bg-soft": "#07111f",
  "--pm-panel": "rgba(8,17,31,0.88)",
  "--pm-panel-strong": "rgba(10,22,39,0.96)",
  "--pm-panel-soft": "rgba(255,255,255,0.035)",
  "--pm-chart": "rgba(3,11,22,0.78)",
  "--pm-field": "rgba(4,12,24,0.82)",
  "--pm-border": "rgba(148,163,184,0.13)",
  "--pm-border-strong": "rgba(148,163,184,0.22)",
  "--pm-text": "#f4f4f5",
  "--pm-muted": "#a1a1aa",
  "--pm-faint": "#52525b",
  "--pm-focus": "#67e8f9",
  "--pm-shadow": "inset 0 1px 0 rgba(255,255,255,0.035), 0 18px 44px rgba(0,0,0,0.26)",
  "--pm-yes": "#5eead4",
  "--pm-yes-strong": "#34d399",
  "--pm-yes-bg": "rgba(20,184,166,0.10)",
  "--pm-yes-border": "rgba(45,212,191,0.26)",
  "--pm-no": "#fda4af",
  "--pm-no-strong": "#fb7185",
  "--pm-no-bg": "rgba(244,63,94,0.11)",
  "--pm-no-border": "rgba(251,113,133,0.26)",
};

const panelClass = "rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-panel)] shadow-[var(--pm-shadow)] backdrop-blur-xl";
const focusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pm-bg)]";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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

function statusTone(status: string) {
  if (status === "live") return { label: "Live", color: "#059669", bg: "rgba(16,185,129,0.12)", border: "rgba(5,150,105,0.22)" };
  if (status === "connecting") return { label: "Connecting", color: "#d97706", bg: "rgba(245,158,11,0.12)", border: "rgba(217,119,6,0.24)" };
  if (status === "error") return { label: "Socket error", color: "#e11d48", bg: "rgba(244,63,94,0.12)", border: "rgba(225,29,72,0.24)" };
  return { label: "Stale", color: "#d97706", bg: "rgba(245,158,11,0.12)", border: "rgba(217,119,6,0.24)" };
}

function StatusBadge(props: { status: string }) {
  const tone = statusTone(props.status);
  return (
    <span
      className="inline-flex h-10 items-center gap-2 rounded-full border px-3 text-xs font-semibold"
      style={{ color: tone.color, background: tone.bg, borderColor: tone.border }}
      aria-live="polite"
    >
      <Signal size={14} aria-hidden="true" />
      Binance {tone.label}
    </span>
  );
}

function StatCell(props: { label: string; value: ReactNode; tone?: "yes" | "no" | "default" }) {
  const { label, value, tone = "default" } = props;
  return (
    <div className="rounded-xl border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-3 py-2 xl:py-1.5">
      <p className="text-xs text-[var(--pm-faint)]">{label}</p>
      <p className={cx("mt-1 truncate font-mono text-sm font-semibold", tone === "yes" && "text-[var(--pm-yes)]", tone === "no" && "text-[var(--pm-no)]", tone === "default" && "text-[var(--pm-text)]")}>
        {value}
      </p>
    </div>
  );
}

function AssetBadge(props: { asset: string; compact?: boolean }) {
  const size = props.compact ? "h-8 w-8" : "h-10 w-10";
  if (props.asset === "BTC") {
    return (
      <span className={cx("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-600 text-white shadow-[0_0_24px_rgba(245,158,11,0.18)]", size)}>
        <Bitcoin size={props.compact ? 17 : 22} strokeWidth={2.5} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-full bg-[#101626] shadow-[0_0_24px_rgba(45,212,191,0.13)]", size)} aria-label="SOL">
      <span className="grid gap-0.5">
        <span className="block h-1.5 w-5 rounded-full bg-gradient-to-r from-teal-300 via-purple-400 to-fuchsia-400" />
        <span className="block h-1.5 w-5 rounded-full bg-gradient-to-r from-fuchsia-400 via-purple-400 to-teal-300" />
        <span className="block h-1.5 w-5 rounded-full bg-gradient-to-r from-teal-300 via-purple-400 to-fuchsia-400" />
      </span>
    </span>
  );
}

function MiniSparkline(props: { candles: PredictionMarket["candles"]; id: string }) {
  const spark = useMemo(() => {
    const closes = props.candles.slice(-34).map((candle) => candle.close).filter(Number.isFinite);
    if (closes.length < 2) {
      return { points: "0,24 220,24", last: { x: 220, y: 24 } };
    }

    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = Math.max(max - min, max * 0.0008, 1e-9);
    const points = closes.map((close, index) => {
      const x = (index / (closes.length - 1)) * 220;
      const y = 38 - ((close - min) / range) * 28;
      return { x, y };
    });
    return {
      points: points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "),
      last: points[points.length - 1] ?? { x: 220, y: 24 },
    };
  }, [props.candles]);

  const gradientId = `sparkline-${props.id}`;

  return (
    <svg viewBox="0 0 220 44" preserveAspectRatio="none" className="h-12 w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="58%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#fb4d5d" />
        </linearGradient>
      </defs>
      <polyline
        points={spark.points}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <circle cx={spark.last.x} cy={spark.last.y} r="2.4" fill="#fb7185" />
    </svg>
  );
}

function OutcomeTile(props: { side: PredictionSide; value: number; large?: boolean; active?: boolean }) {
  const yes = props.side === "yes";
  return (
    <div
      className={cx(
        "rounded-xl border bg-gradient-to-br px-3",
        props.large ? "py-4" : "py-3",
        yes
          ? "border-[var(--pm-yes-border)] from-[rgba(20,184,166,0.16)] to-[rgba(20,184,166,0.045)]"
          : "border-[var(--pm-no-border)] from-[rgba(244,63,94,0.15)] to-[rgba(244,63,94,0.045)]",
        props.active && (yes ? "shadow-[0_0_0_1px_rgba(45,212,191,0.38)]" : "shadow-[0_0_0_1px_rgba(251,113,133,0.38)]"),
      )}
    >
      <p className={cx("text-[11px] font-bold uppercase tracking-[0.12em]", yes ? "text-[var(--pm-yes)]" : "text-[var(--pm-no)]")}>
        {yes ? "YES" : "NO"}
      </p>
      <p className={cx("mt-1 font-mono font-black tracking-tight", props.large ? "text-3xl" : "text-xl", yes ? "text-[var(--pm-yes)]" : "text-[var(--pm-no)]")}>
        {odds(props.value)}
      </p>
    </div>
  );
}

function MarketSelectorCard(props: { market: PredictionMarket; active: boolean; onClick: () => void }) {
  const { market, active, onClick } = props;
  const moveUp = (market.changePct ?? 0) >= 0;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "group relative min-h-[188px] overflow-hidden rounded-2xl border p-4 text-left transition-colors",
        focusClass,
        active
          ? "border-cyan-300/30 bg-[rgba(8,20,37,0.96)]"
          : "border-[var(--pm-border)] bg-[var(--pm-panel)] hover:border-[var(--pm-border-strong)] hover:bg-[var(--pm-panel-strong)]",
      )}
    >
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <AssetBadge asset={market.asset} />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[var(--pm-text)]">{market.label}</p>
            <p className="mt-0.5 text-xs text-[var(--pm-muted)]">{market.durationMinutes}m rolling binary</p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg border border-[var(--pm-border)] bg-[var(--pm-field)] px-2.5 py-1.5 font-mono text-xs font-bold text-[var(--pm-yes)]">
          {timer(market.timeRemainingMs)}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <OutcomeTile side="yes" value={market.yesPrice} active={active} />
        <OutcomeTile side="no" value={market.noPrice} active={active} />
      </div>
      <div className="mt-3">
        <MiniSparkline candles={market.candles} id={market.key} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-sm text-[var(--pm-muted)]">{price(market.livePrice, market.asset)}</span>
        <span className={cx("font-mono text-sm font-bold", moveUp ? "text-[var(--pm-yes)]" : "text-[var(--pm-no)]")}>{pct(market.changePct)}</span>
      </div>
    </button>
  );
}

function QuoteBlock(props: { side: PredictionSide; value: number }) {
  const yes = props.side === "yes";
  return (
    <div className={cx("rounded-xl border px-4 py-3", yes ? "border-[var(--pm-yes-border)] bg-[var(--pm-yes-bg)]" : "border-[var(--pm-no-border)] bg-[var(--pm-no-bg)]")}>
      <p className={cx("text-[11px] font-bold uppercase tracking-[0.12em]", yes ? "text-[var(--pm-yes)]" : "text-[var(--pm-no)]")}>
        {yes ? "YES mark" : "NO mark"}
      </p>
      <p className={cx("mt-1 font-mono text-3xl font-black tracking-tight", yes ? "text-[var(--pm-yes)]" : "text-[var(--pm-no)]")}>{odds(props.value)}</p>
    </div>
  );
}

function OrderTicket(props: {
  market: PredictionMarket;
  cashUSDC: number;
  portfolioValue: number;
  openPositions: number;
  yesShares: number;
  noShares: number;
  onSubmit: (args: { side: PredictionSide; action: PredictionAction; shares: number }) => void;
  onReset: () => void;
}) {
  const { market, cashUSDC, portfolioValue, openPositions, yesShares, noShares, onSubmit, onReset } = props;
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
  const marketReady = Boolean(market.startPrice && market.livePrice && market.timeRemainingMs > 0);

  const submit = (event: FormEvent<HTMLFormElement>) => {
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
    <section className={cx(panelClass, "overflow-hidden")} aria-labelledby="paper-ticket-title">
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <h2 id="paper-ticket-title" className="flex items-center gap-2 text-base font-bold text-[var(--pm-text)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] text-[var(--pm-muted)]">
              <ReceiptText size={16} aria-hidden="true" />
            </span>
            Paper Ticket
          </h2>
          <p className="mt-1 text-xs text-[var(--pm-faint)]">Paper shares settle at $1 or $0.</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className={cx("inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-3 text-xs font-semibold text-[var(--pm-muted)] hover:text-[var(--pm-text)]", focusClass)}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reset
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4 px-4 pb-4 pt-2">
        <fieldset>
          <legend className="sr-only">Prediction side</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["yes", "no"] as const).map((item) => {
              const active = side === item;
              const yes = item === "yes";
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSide(item)}
                  className={cx(
                    "h-[54px] rounded-xl border px-3 text-sm font-black transition-colors",
                    focusClass,
                    active
                      ? yes ? "border-[var(--pm-yes-strong)] bg-[var(--pm-yes-bg)] text-[var(--pm-yes)] shadow-[0_0_0_1px_rgba(45,212,191,0.18)]" : "border-[var(--pm-no-strong)] bg-[var(--pm-no-bg)] text-[var(--pm-no)] shadow-[0_0_0_1px_rgba(251,113,133,0.18)]"
                      : "border-[var(--pm-border)] bg-[var(--pm-field)] text-[var(--pm-muted)] hover:text-[var(--pm-text)]",
                  )}
                >
                  {item.toUpperCase()} {odds(sidePrice(market, item))}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="sr-only">Order action</legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--pm-border)] bg-[var(--pm-field)] p-1">
            {(["buy", "sell"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={action === item}
                onClick={() => setAction(item)}
                className={cx(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-colors",
                  focusClass,
                  action === item
                    ? item === "buy" ? "bg-[var(--pm-yes-bg)] text-[var(--pm-yes)]" : "bg-[var(--pm-panel-strong)] text-[var(--pm-muted)]"
                    : "text-[var(--pm-faint)] hover:text-[var(--pm-muted)]",
                )}
              >
                {item === "buy" ? <ShoppingCart size={14} aria-hidden="true" /> : <RotateCcw size={14} aria-hidden="true" />}
                {item === "buy" ? "Buy shares" : "Sell held"}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="prediction-shares" className="mb-1.5 block text-xs font-semibold text-[var(--pm-muted)]">
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
            className={cx("h-11 w-full rounded-xl border border-[var(--pm-border)] bg-[var(--pm-field)] px-3 font-mono text-sm text-[var(--pm-text)] outline-none placeholder:text-[var(--pm-faint)]", focusClass)}
          />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[5, 10, 25, 50].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setShares(String(amount))}
                className={cx(
                  "h-9 rounded-lg border px-2 font-mono text-xs transition-colors",
                  focusClass,
                  shares === String(amount)
                    ? "border-[var(--pm-yes-border)] bg-[var(--pm-yes-bg)] text-[var(--pm-yes)]"
                    : "border-[var(--pm-border)] bg-[var(--pm-panel-soft)] text-[var(--pm-muted)] hover:text-[var(--pm-text)]",
                )}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] p-3 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--pm-faint)]">Price</span>
            <span className="font-mono font-semibold text-[var(--pm-text)]">{odds(currentPrice)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4">
            <span className="text-[var(--pm-faint)]">{action === "buy" ? "Cost" : "Proceeds"}</span>
            <span className="font-mono font-semibold text-[var(--pm-text)]">{money(notional, 3)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4">
            <span className="text-[var(--pm-faint)]">Max payout</span>
            <span className="font-mono font-semibold text-[var(--pm-yes)]">{money(maxPayout, 3)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4">
            <span className="text-[var(--pm-faint)]">Max profit</span>
            <span className="font-mono font-semibold text-[var(--pm-yes)]">{money(maxProfit, 3)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4">
            <span className="text-[var(--pm-faint)]">Held {side.toUpperCase()}</span>
            <span className="font-mono font-semibold text-[var(--pm-muted)]">{heldShares.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4">
            <span className="text-[var(--pm-faint)]">Paper cash</span>
            <span className="font-mono font-semibold text-[var(--pm-text)]">{money(cashUSDC, 2)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4">
            <span className="text-[var(--pm-faint)]">Portfolio</span>
            <span className="font-mono font-semibold text-[var(--pm-text)]">{money(portfolioValue, 2)} · {openPositions}</span>
          </div>
        </div>

        {err && (
          <div id="prediction-order-error" className="flex items-start gap-2 rounded-xl border border-[var(--pm-no-border)] bg-[var(--pm-no-bg)] px-3 py-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--pm-no)]" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-[var(--pm-no)]">{err}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!marketReady}
          className={cx(
            "h-12 w-full rounded-xl border text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:border-[var(--pm-border)] disabled:bg-[var(--pm-panel-soft)] disabled:text-[var(--pm-faint)]",
            focusClass,
            side === "yes"
              ? "border-[var(--pm-yes-border)] bg-gradient-to-r from-emerald-400 to-teal-500 text-[#032014] hover:brightness-110"
              : "border-[var(--pm-no-border)] bg-gradient-to-r from-rose-400 to-pink-500 text-[#26030a] hover:brightness-110",
          )}
        >
          {action === "buy" ? "Place order" : "Place sell order"}
        </button>
      </form>
    </section>
  );
}

function TerminalUtilityBar(props: {
  status: string;
  cashUSDC: number;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 lg:mr-36">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--pm-yes-strong)] shadow-[0_0_14px_rgba(52,211,153,0.75)]" />
        <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-[var(--pm-faint)]">Prediction Market</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge status={props.status} />
        <span className="hidden h-10 items-center rounded-full border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-3 font-mono text-xs text-[var(--pm-muted)] sm:inline-flex">
          {money(props.cashUSDC)}
        </span>
        <button
          type="button"
          onClick={props.onRefresh}
          className={cx("inline-flex h-10 items-center gap-2 rounded-full border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-3 text-xs font-semibold text-[var(--pm-muted)] transition-colors hover:text-[var(--pm-text)]", focusClass)}
          aria-label="Refresh prediction market history"
        >
          <RefreshCw size={14} className={props.loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh
        </button>
      </div>
    </div>
  );
}

function ActiveMarketHeader(props: {
  market: PredictionMarket;
  markets: PredictionMarket[];
  status: ReturnType<typeof statusTone>;
  lastMoveUp: boolean;
  onSelectMarket: (key: string) => void;
}) {
  const { market, markets, status, lastMoveUp, onSelectMarket } = props;
  const assetWindows = markets.filter((item) => item.asset === market.asset);

  return (
    <div className="grid gap-4 border-b border-[var(--pm-border)] p-4 lg:grid-cols-[minmax(0,1fr)_290px]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-bold"
            style={{ color: status.color, background: status.bg, borderColor: status.border }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Active market
          </span>
          <span className="inline-flex h-8 items-center gap-2 rounded-full border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-3 font-mono text-xs text-[var(--pm-muted)]">
            <AssetBadge asset={market.asset} compact />
            {market.label}
          </span>
        </div>

        <h2 id="active-market-title" className="max-w-3xl text-xl font-bold leading-tight text-[var(--pm-text)]">
          {market.question}
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <StatCell label="Open" value={price(market.startPrice, market.asset)} />
          <StatCell label="Live" value={price(market.livePrice, market.asset)} tone={lastMoveUp ? "yes" : "no"} />
          <StatCell label="Distance" value={money(market.distanceUsd, market.asset === "BTC" ? 1 : 4)} tone={(market.distanceUsd ?? 0) >= 0 ? "yes" : "no"} />
          <StatCell label="Move" value={pct(market.changePct)} tone={(market.changePct ?? 0) >= 0 ? "yes" : "no"} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex rounded-xl border border-[var(--pm-border)] bg-[var(--pm-field)] p-1" aria-label="Market window">
            {assetWindows.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectMarket(item.key)}
                aria-pressed={item.key === market.key}
                className={cx(
                  "h-9 rounded-lg px-3 font-mono text-xs font-semibold transition-colors",
                  focusClass,
                  item.key === market.key ? "bg-[var(--pm-panel-strong)] text-[var(--pm-text)]" : "text-[var(--pm-faint)] hover:text-[var(--pm-muted)]",
                )}
              >
                {item.durationMinutes}m
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-1 rounded-xl border border-[var(--pm-border)] bg-[var(--pm-field)] p-1 text-[var(--pm-muted)] lg:flex" aria-hidden="true">
            {[ChartSpline, SlidersHorizontal, Expand, MoreVertical].map((Icon, index) => (
              <span key={index} className="flex h-8 w-8 items-center justify-center rounded-lg">
                <Icon size={15} strokeWidth={1.7} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 self-start">
        <QuoteBlock side="yes" value={market.yesPrice} />
        <QuoteBlock side="no" value={market.noPrice} />
      </div>
    </div>
  );
}

function PortfolioStrip(props: {
  cashUSDC: number;
  portfolioValue: number;
  openPositions: number;
  settlements: ReturnType<typeof usePredictionPaper>["state"]["settlements"];
}) {
  const pnl = props.portfolioValue - 1_000;
  const closed = props.settlements.length;
  const wins = props.settlements.filter((settlement) => settlement.pnl > 0).length;
  const winRate = closed ? `${((wins / closed) * 100).toFixed(1)}%` : "--";
  const cells = [
    { label: "Paper cash", value: money(props.cashUSDC, 2), icon: CircleDollarSign, tone: "default" as const },
    { label: "Total positions", value: String(props.openPositions), icon: BriefcaseBusiness, tone: "default" as const },
    { label: "Open P&L", value: money(pnl, 2), icon: TrendingUp, tone: pnl >= 0 ? "yes" as const : "no" as const },
    { label: "Win rate", value: winRate, icon: Target, tone: "default" as const },
    { label: "Equity", value: money(props.portfolioValue, 2), icon: PieChart, tone: "default" as const },
  ];

  return (
    <section className={cx(panelClass, "grid grid-cols-1 divide-y divide-[var(--pm-border)] overflow-hidden md:grid-cols-5 md:divide-x md:divide-y-0")} aria-label="Paper portfolio summary">
      {cells.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] text-[var(--pm-muted)]">
            <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--pm-faint)]">{label}</p>
            <p className={cx("mt-1 truncate font-mono text-sm font-bold", tone === "yes" && "text-[var(--pm-yes)]", tone === "no" && "text-[var(--pm-no)]", tone === "default" && "text-[var(--pm-text)]")}>
              {value}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}

function ActivityPanel(props: {
  market: PredictionMarket;
  positions: ReturnType<typeof usePredictionPaper>["state"]["positions"];
  fills: ReturnType<typeof usePredictionPaper>["state"]["fills"];
  settlements: ReturnType<typeof usePredictionPaper>["state"]["settlements"];
  clearHistory: () => void;
  titleId?: string;
}) {
  const { market, positions, fills, settlements, clearHistory, titleId = "activity-title" } = props;
  const openPositions = positions.slice(0, 4);
  const hasHistory = fills.length > 0 || settlements.length > 0;
  return (
    <section className={panelClass} aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-3 border-b border-[var(--pm-border)] px-4 py-3">
        <div>
          <h2 id={titleId} className="flex items-center gap-2 text-sm font-semibold text-[var(--pm-text)]">
            <History size={15} aria-hidden="true" />
            Activity
          </h2>
          <p className="mt-1 text-xs text-[var(--pm-faint)]">{openPositions.length} open · {settlements.length} settled</p>
        </div>
        {hasHistory && (
          <button
            type="button"
            onClick={clearHistory}
            className={cx("inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-2.5 text-xs font-semibold text-[var(--pm-muted)] hover:text-[var(--pm-text)]", focusClass)}
          >
            <X size={14} aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      <div className="max-h-[360px] overflow-y-auto p-3">
        {openPositions.length === 0 ? (
          <div className="rounded-xl border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-4 py-6 text-center">
            <p className="text-sm font-semibold text-[var(--pm-text)]">No paper shares</p>
            <p className="mx-auto mt-1 max-w-[280px] text-xs leading-relaxed text-[var(--pm-faint)]">The ticket is ready when you want to test a YES or NO view.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {openPositions.map((position) => {
              const currentMarket = position.contractId === market.contractId ? market : null;
              const mark = currentMarket ? sidePrice(currentMarket, position.side) : null;
              const value = mark ? position.shares * mark : null;
              const pnl = value === null ? null : value - position.shares * position.avgPrice;
              const yes = position.side === "yes";
              return (
                <div key={position.id} className="rounded-xl border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-xs font-semibold text-[var(--pm-text)]">{position.asset} {position.durationMinutes}m {position.side.toUpperCase()}</p>
                    <span className={cx("font-mono text-xs", yes ? "text-[var(--pm-yes)]" : "text-[var(--pm-no)]")}>{position.shares.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <span className="text-[var(--pm-faint)]">Avg <b className="font-mono font-semibold text-[var(--pm-muted)]">{odds(position.avgPrice)}</b></span>
                    <span className="text-[var(--pm-faint)]">Mark <b className="font-mono font-semibold text-[var(--pm-muted)]">{mark ? odds(mark) : "--"}</b></span>
                    <span className={cx("font-mono font-semibold", (pnl ?? 0) >= 0 ? "text-[var(--pm-yes)]" : "text-[var(--pm-no)]")}>{pnl === null ? "--" : money(pnl, 2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasHistory && (
          <div className="mt-3 space-y-2">
            {settlements.slice(0, 2).map((settlement) => (
              <div key={settlement.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-3 py-2 text-xs">
                <span className="font-semibold text-[var(--pm-muted)]">SETTLED {settlement.asset} {settlement.durationMinutes}m</span>
                <span className={cx("font-mono", settlement.pnl >= 0 ? "text-[var(--pm-yes)]" : "text-[var(--pm-no)]")}>{money(settlement.pnl, 2)}</span>
              </div>
            ))}
            {fills.slice(0, 4).map((fill) => (
              <div key={fill.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-3 py-2 text-xs">
                <span className={cx("font-semibold", fill.side === "yes" ? "text-[var(--pm-yes)]" : "text-[var(--pm-no)]")}>{fill.action.toUpperCase()} {fill.side.toUpperCase()}</span>
                <span className="font-mono text-[var(--pm-muted)]">{fill.shares.toFixed(2)} @ {odds(fill.price)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ReferencePanel(props: {
  asset: string;
  references: PolymarketReference[];
  warning: string | null;
  loading: boolean;
}) {
  const { asset, references, warning, loading } = props;
  return (
    <section className={panelClass} aria-labelledby="reference-title">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--pm-border)] px-4 py-3">
        <h2 id="reference-title" className="flex items-center gap-2 text-sm font-semibold text-[var(--pm-text)]">
          <Sparkles size={15} aria-hidden="true" />
          Reference
        </h2>
        <span className="font-mono text-xs text-[var(--pm-faint)]">{asset}</span>
      </div>
      <div className="p-3">
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading Polymarket references">
            <div className="h-12 animate-pulse rounded-xl bg-[var(--pm-panel-soft)]" />
            <div className="h-12 animate-pulse rounded-xl bg-[var(--pm-panel-soft)]" />
          </div>
        ) : warning ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-amber-600">{warning}</p>
          </div>
        ) : references.length === 0 ? (
          <p className="rounded-xl border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-3 py-3 text-xs leading-relaxed text-[var(--pm-faint)]">
            No clean related Polymarket markets returned.
          </p>
        ) : (
          <div className="space-y-2">
            {references.slice(0, 2).map((reference) => (
              <div key={reference.id} className="rounded-xl border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-3 py-2">
                <p className="line-clamp-1 text-xs font-semibold text-[var(--pm-text)]">{reference.question}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-[var(--pm-faint)]">
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

function LoadingShell() {
  return (
    <div className="flex min-h-[520px] items-center justify-center bg-[var(--pm-bg)] px-6 text-[var(--pm-text)]" style={pmSurfaceVars}>
      <div className={cx("w-full max-w-xl p-8 text-center", panelClass)}>
        <Activity size={22} className="mx-auto animate-pulse text-[var(--pm-faint)]" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold">Loading prediction markets</p>
        <p className="mt-2 text-xs text-[var(--pm-faint)]">Fetching BTC/SOL futures candles and opening the rolling books.</p>
      </div>
    </div>
  );
}

export function PredictionMarketTerminal() {
  const { markets, loading, error, wsStatus, refreshHistory } = usePredictionMarkets();
  const [activeKey, setActiveKey] = useState("btc-5m");
  const [compactChart, setCompactChart] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const activeMarket = markets.find((market) => market.key === activeKey) ?? markets[0];
  const activeAsset = activeMarket?.asset;
  const paper = usePredictionPaper(markets);
  const [references, setReferences] = useState<PolymarketReference[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsWarning, setRefsWarning] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setHydrated(true));
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompactChart(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!activeAsset) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setRefsLoading(true);
      setRefsWarning(null);
    });
    fetch(`/api/prediction/polymarket?asset=${activeAsset}`, { cache: "no-store" })
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
  }, [activeAsset]);

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
  const chartHeight = compactChart ? 340 : 330;

  if (!hydrated || !activeMarket) return <LoadingShell />;

  return (
    <div
      data-native-scroll
      className="h-full min-h-0 overflow-y-auto overscroll-contain bg-[var(--pm-bg)] text-[var(--pm-text)] transition-colors"
      style={{
        ...pmSurfaceVars,
        scrollbarWidth: "thin",
        WebkitOverflowScrolling: "touch",
        background: "radial-gradient(circle at 22% -10%, rgba(56,189,248,0.07), transparent 24%), radial-gradient(circle at 82% 8%, rgba(251,113,133,0.06), transparent 22%), linear-gradient(180deg, #030713 0%, #050b16 58%, #030713 100%)",
      }}
    >
      <div className="mx-auto max-w-[1500px] px-4 pb-8 pt-3 sm:px-5 lg:px-5">
        <TerminalUtilityBar
          status={activeMarket.wsStatus ?? wsStatus}
          cashUSDC={paper.state.cashUSDC}
          loading={loading}
          onRefresh={() => void refreshHistory()}
        />

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-2xl border border-[var(--pm-no-border)] bg-[var(--pm-no-bg)] px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--pm-no)]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-[var(--pm-no)]">Market history failed</p>
              <p className="mt-1 text-xs text-[var(--pm-no)]">{error}</p>
            </div>
          </div>
        )}

        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {markets.map((market) => (
            <MarketSelectorCard key={market.key} market={market} active={market.key === activeMarket.key} onClick={() => setActiveKey(market.key)} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
          <main className="min-w-0 space-y-4">
            <section className={cx(panelClass, "overflow-hidden")} aria-labelledby="live-chart-title">
              <ActiveMarketHeader
                market={activeMarket}
                markets={markets}
                status={status}
                lastMoveUp={lastMoveUp}
                onSelectMarket={setActiveKey}
              />

              <div className="bg-[var(--pm-chart)]">
                <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] text-[var(--pm-muted)]">
                      <BarChart3 size={16} aria-hidden="true" />
                    </span>
                    <div>
                      <p id="live-chart-title" className="text-sm font-bold">Live window chart</p>
                      <p className="text-xs text-[var(--pm-faint)]">Reference line marks the window open.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-3 py-2 font-mono text-[var(--pm-muted)]">
                      Open {price(activeMarket.startPrice, activeMarket.asset)}
                    </span>
                    <span className={cx("rounded-full border border-[var(--pm-border)] bg-[var(--pm-panel-soft)] px-3 py-2 font-mono", lastMoveUp ? "text-[var(--pm-yes)]" : "text-[var(--pm-no)]")}>
                      Live {price(activeMarket.livePrice, activeMarket.asset)}
                    </span>
                  </div>
                </div>

                {loading && activeMarket.candles.length === 0 ? (
                  <div className="flex h-[330px] items-center justify-center">
                    <div className="text-center">
                      <Activity size={22} className="mx-auto animate-pulse text-[var(--pm-faint)]" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold">Loading Binance candles</p>
                      <p className="mt-1 text-xs text-[var(--pm-faint)]">Opening realtime paper book</p>
                    </div>
                  </div>
                ) : (
                  <div className="px-1 pb-2 sm:px-2">
                    <CandlesChart
                      candles={activeMarket.candles}
                      height={chartHeight}
                      livePrice={activeMarket.livePrice}
                      symbol={activeMarket.contractId}
                      referencePrice={{
                        price: activeMarket.startPrice,
                        title: "open",
                        color: "#f59e0b",
                      }}
                    />
                  </div>
                )}
              </div>
            </section>

            <PortfolioStrip
              cashUSDC={paper.state.cashUSDC}
              portfolioValue={paper.portfolioValue}
              openPositions={paper.state.positions.length}
              settlements={paper.state.settlements}
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ActivityPanel
                market={activeMarket}
                positions={paper.state.positions}
                fills={paper.state.fills}
                settlements={paper.state.settlements}
                clearHistory={paper.clearHistory}
                titleId="activity-title"
              />

              <ReferencePanel
                asset={activeMarket.asset}
                references={references}
                warning={refsWarning}
                loading={refsLoading}
              />
            </div>
          </main>

          <aside className="space-y-4 xl:sticky xl:top-3 xl:self-start">
            <OrderTicket
              market={activeMarket}
              cashUSDC={paper.state.cashUSDC}
              portfolioValue={paper.portfolioValue}
              openPositions={paper.state.positions.length}
              yesShares={activeYes?.shares ?? 0}
              noShares={activeNo?.shares ?? 0}
              onSubmit={({ side, action, shares }) => paper.placeOrder({ market: activeMarket, side, action, shares })}
              onReset={paper.reset}
            />
          </aside>
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
