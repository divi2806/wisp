"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Send, X } from "lucide-react";
import WispMascot, { type WispMood } from "@/components/WispMascot";
import { MiniCandleViz } from "@/components/trade/MiniCandleViz";
import type { PolymarketReference, PredictionFill, PredictionMarket, PredictionPaperState, PredictionSettlement } from "@/components/prediction/types";

type Msg = { id: string; role: "user" | "wisp"; text: string };

function formatTime(ms: number | null | undefined) {
  if (!ms || !Number.isFinite(ms)) return "--:--";
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+?\*\*|`[^`]+?`)/g).map((chunk, idx) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return <strong key={idx} className="font-semibold text-zinc-100">{chunk.slice(2, -2)}</strong>;
    }
    if (chunk.startsWith("`") && chunk.endsWith("`")) {
      return <code key={idx} className="rounded-md bg-white/5 px-1 py-0.5 font-mono text-[0.92em] text-cyan-200">{chunk.slice(1, -1)}</code>;
    }
    return <span key={idx}>{chunk.replace(/\*\*/g, "").replace(/`/g, "")}</span>;
  });
}

function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
        if (bullet) {
          return (
            <div key={idx} className="flex gap-2">
              <span className="text-zinc-500">•</span>
              <span>{renderInline(bullet[1])}</span>
            </div>
          );
        }
        const numbered = /^(\d+)[.)]\s+(.+)$/.exec(trimmed);
        if (numbered) {
          return (
            <div key={idx} className="flex gap-2">
              <span className="font-mono text-zinc-500">{numbered[1]}.</span>
              <span>{renderInline(numbered[2])}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInline(trimmed.replace(/^#{1,6}\s+/, ""))}</p>;
      })}
    </div>
  );
}

function buildContext(args: {
  market: PredictionMarket;
  markets: PredictionMarket[];
  paper: PredictionPaperState;
  portfolioValue: number;
  references: PolymarketReference[];
}) {
  const yes = args.paper.positions.find((position) => position.contractId === args.market.contractId && position.side === "yes");
  const no = args.paper.positions.find((position) => position.contractId === args.market.contractId && position.side === "no");
  return {
    activeMarket: {
      label: args.market.label,
      asset: args.market.asset,
      durationMinutes: args.market.durationMinutes,
      question: args.market.question,
      startPrice: args.market.startPrice,
      livePrice: args.market.livePrice,
      yesPrice: args.market.yesPrice,
      noPrice: args.market.noPrice,
      yesProbability: args.market.yesProbability,
      changePct: args.market.changePct,
      distanceUsd: args.market.distanceUsd,
      timeRemainingMs: args.market.timeRemainingMs,
      progressPct: args.market.progressPct,
      wsStatus: args.market.wsStatus,
    },
    markets: args.markets.map((market) => ({
      label: market.label,
      livePrice: market.livePrice,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      changePct: market.changePct,
      timeRemainingMs: market.timeRemainingMs,
    })),
    recentCandles: args.market.candles.slice(-90).map((candle) => ({
      t: candle.time,
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close,
      v: candle.volume,
    })),
    paper: {
      cashUSDC: args.paper.cashUSDC,
      portfolioValue: args.portfolioValue,
      activePosition: {
        yesShares: yes?.shares ?? 0,
        noShares: no?.shares ?? 0,
        yesAvg: yes?.avgPrice ?? null,
        noAvg: no?.avgPrice ?? null,
      },
      openPositionsCount: args.paper.positions.length,
      latestFills: args.paper.fills.slice(0, 10).map((fill: PredictionFill) => ({
        atMs: fill.atMs,
        action: fill.action,
        side: fill.side,
        shares: fill.shares,
        price: fill.price,
        notional: fill.notional,
      })),
      latestSettlements: args.paper.settlements.slice(0, 10).map((settlement: PredictionSettlement) => ({
        atMs: settlement.atMs,
        side: settlement.side,
        shares: settlement.shares,
        avgPrice: settlement.avgPrice,
        finalPrice: settlement.finalPrice,
        outcome: settlement.outcome,
        payout: settlement.payout,
        pnl: settlement.pnl,
      })),
    },
    polymarketReferences: args.references.slice(0, 5).map((reference) => ({
      question: reference.question,
      liquidity: reference.liquidity,
      volume: reference.volume,
      outcomes: reference.outcomes,
      outcomePrices: reference.outcomePrices,
    })),
  };
}

export function WispPredictionChat(props: {
  market: PredictionMarket;
  markets: PredictionMarket[];
  paper: PredictionPaperState;
  portfolioValue: number;
  references: PolymarketReference[];
}) {
  const { market, markets, paper, portfolioValue, references } = props;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const reduceMotion = useReducedMotion();
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    {
      id: crypto.randomUUID(),
      role: "wisp",
      text: "I’m watching the prediction book. Ask me whether YES is overpriced, where the window open is, or how your paper shares settle.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    return () => cancelAnimationFrame(frame);
  }, [msgs, loading, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const mood = useMemo<WispMood>(() => {
    if (loading) return "thinking";
    if (market.wsStatus !== "live") return "thinking";
    if (open) return "happy";
    return market.yesProbability >= 0.62 || market.yesProbability <= 0.38 ? "mischief" : "idle";
  }, [loading, market.wsStatus, market.yesProbability, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMsgs((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/wisp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface: "prediction",
          message: text,
          predictionContext: buildContext({ market, markets, paper, portfolioValue, references }),
        }),
      });
      const json = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "AI failed");
      setMsgs((prev) => [...prev, { id: crypto.randomUUID(), role: "wisp", text: json.reply?.trim() || "I need one more tick to answer that cleanly." }]);
    } catch {
      setMsgs((prev) => [...prev, { id: crypto.randomUUID(), role: "wisp", text: "I’m offline or rate-limited. The paper market still runs; ask again in a bit." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[120] flex h-14 w-14 items-center justify-center rounded-2xl focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a16] sm:bottom-6 sm:right-6 sm:h-[76px] sm:w-[76px] sm:rounded-[28px]"
        style={{
          background: "radial-gradient(circle at 30% 25%, rgba(251,113,133,0.18), rgba(13,16,32,0.9) 56%, rgba(13,16,32,0.98) 100%)",
          boxShadow: "0 22px 60px rgba(0,0,0,0.62), 0 0 90px rgba(251,113,133,0.14)",
        }}
        animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
        transition={reduceMotion ? { duration: 0 } : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        aria-label="Open Wisp prediction chat"
      >
        <WispMascot size={34} mood={mood} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[140]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 h-full w-full cursor-default bg-black/60" onClick={() => setOpen(false)} aria-label="Close Wisp prediction chat overlay" />
            <motion.div
              className="absolute bottom-3 right-3 flex h-[78vh] min-h-[420px] max-h-[820px] w-[460px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl sm:bottom-6 sm:right-6 sm:h-[72vh] sm:min-h-[560px] sm:max-w-[94vw] sm:rounded-[32px]"
              style={{
                background: "rgba(11,13,26,0.96)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.65)",
              }}
              initial={reduceMotion ? { opacity: 0 } : { y: 18, scale: 0.98, opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0, scale: 1, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { y: 18, scale: 0.98, opacity: 0 }}
              transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 280, damping: 24 }}
            >
              <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
                <div className="relative h-[38px] w-[30px]">
                  <WispMascot size={30} mood={loading ? "thinking" : mood} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-100">Wisp</p>
                  <p className="truncate font-mono text-[11px] text-zinc-500">
                    {market.label} · {formatTime(market.timeRemainingMs)} left
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-cyan-300"
                  aria-label="Close chat"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
                {market.candles.length > 5 && (
                  <div className="mb-2">
                    <MiniCandleViz candles={market.candles.slice(-80).map((c) => ({ t: c.time, o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume }))} height={136} />
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-zinc-500">
                      <span>YES <span className="text-emerald-300">${market.yesPrice.toFixed(3)}</span></span>
                      <span>NO <span className="text-rose-300">${market.noPrice.toFixed(3)}</span></span>
                      <span>Open <span className="text-zinc-300">{market.startPrice?.toFixed(market.asset === "BTC" ? 1 : 3) ?? "n/a"}</span></span>
                    </div>
                  </div>
                )}

                {msgs.map((msg) => (
                  <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className="max-w-[85%] rounded-2xl border border-white/5 px-3.5 py-2.5 text-[14px] leading-relaxed"
                      style={{
                        background: msg.role === "user" ? "rgba(251,113,133,0.14)" : "rgba(255,255,255,0.04)",
                        color: msg.role === "user" ? "#ffe4e6" : "#a1a1aa",
                      }}
                    >
                      {msg.role === "wisp" ? <Prose text={msg.text} /> : msg.text}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-zinc-500">
                      thinking<span className="inline-flex w-6 justify-start"><span className="animate-pulse">...</span></span>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t border-white/5 px-5 py-4">
                <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/15 px-3.5 py-2.5 focus-within:border-cyan-300/40 focus-within:ring-2 focus-within:ring-cyan-300/25">
                  <label htmlFor="prediction-wisp-input" className="sr-only">Ask Wisp about this prediction market</label>
                  <textarea
                    id="prediction-wisp-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask if YES is overpriced, or about your paper shares..."
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-[14px] text-zinc-100 focus-visible:outline-none placeholder:text-zinc-600"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <button
                    onClick={() => void send()}
                    disabled={!input.trim() || loading}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 text-zinc-500 transition-colors enabled:text-rose-200 enabled:hover:bg-rose-400/10 focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed"
                    aria-label="Send"
                  >
                    <Send size={18} />
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] text-zinc-700">Paper-only prediction markets. No real execution.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
