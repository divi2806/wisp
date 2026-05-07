"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X } from "lucide-react";
import WispMascot, { type WispMood } from "@/components/WispMascot";
import { MiniCandleViz } from "@/components/trade/MiniCandleViz";

type MiniCandle = { t: number; o: number; h: number; l: number; c: number; v: number };
type Msg = { id: string; role: "user" | "wisp"; text: string };

export type TradeContext = {
  symbol?: string;
  interval?: string;
  candleType?: string;
  indicators?: Record<string, boolean>;
  livePrice?: number | null;
  recentCandles?: MiniCandle[];
  indicatorValues?: {
    rsi14?: number | null;
    macd?: { macd: number; signal: number; hist: number } | null;
  };
  lastCandle?: { open: number; high: number; low: number; close: number; changePct?: number | null; rangePct?: number | null } | null;
  paper?: {
    enabled?: boolean;
    cashUSDT?: number;
    position?: number;
    qty?: number;
    avgEntry?: number | null;
    unrealizedPnL?: number | null;
    openOrdersCount?: number;
    fillsCount?: number;
    latestFills?: Array<{ atMs: number; side: "buy" | "sell"; qty: number; price: number; notional: number }>;
    openOrders?: Array<{
      id: string;
      atMs: number;
      side: "buy" | "sell";
      type: "market" | "limit";
      qty: number;
      limitPrice: number | null;
    }>;
  };
};

type ChatMsg = Msg & {
  showChart?: boolean;
  chartCandles?: MiniCandle[];
  chartSymbol?: string;
};

function parseWispActions(text: string) {
  const switchRe = /\[\[SWITCH_SYMBOL:([A-Za-z0-9_-]{2,20})\]\]/g;
  const showChartRe = /\[\[SHOW_CHART\]\]/g;
  let switchSymbol: string | null = null;
  let showChart = false;

  const switchMatch = switchRe.exec(text);
  if (switchMatch?.[1]) switchSymbol = switchMatch[1].toUpperCase();
  if (showChartRe.test(text)) showChart = true;

  const cleaned = text.replace(switchRe, "").replace(showChartRe, "").trim();
  if (!showChart) showChart = shouldShowChart(cleaned);
  return { cleaned, switchSymbol, showChart };
}

function shouldShowChart(text: string) {
  return /\b(chart|candle|candlestick|wick|rsi|macd|indicator|support|resistance|breakout|breakdown|trend|entry|exit|stop|invalidation|scenario|green|red)\b/i.test(
    text
  );
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+?\*\*|`[^`]+?`)/g).map((chunk, idx) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return (
        <strong key={idx} style={{ color: "#e4e4e7", fontWeight: 700 }}>
          {chunk.slice(2, -2)}
        </strong>
      );
    }

    if (chunk.startsWith("`") && chunk.endsWith("`")) {
      return (
        <code
          key={idx}
          className="font-mono rounded-md px-1 py-0.5"
          style={{ background: "rgba(255,255,255,0.06)", color: "#c4b5fd", fontSize: "0.92em" }}
        >
          {chunk.slice(1, -1)}
        </code>
      );
    }

    return <span key={idx}>{chunk.replace(/\*\*/g, "").replace(/`/g, "")}</span>;
  });
}

function Prose({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        const heading = /^#{1,6}\s+(.+)$/.exec(trimmed);
        if (heading) {
          return (
            <p key={idx} className="font-semibold" style={{ color: "#e4e4e7" }}>
              {renderInline(heading[1])}
            </p>
          );
        }

        const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
        if (bullet) {
          return (
            <div key={idx} className="flex gap-2">
              <span style={{ color: "#71717a" }}>•</span>
              <span>{renderInline(bullet[1])}</span>
            </div>
          );
        }

        const numbered = /^(\d+)[.)]\s+(.+)$/.exec(trimmed);
        if (numbered) {
          return (
            <div key={idx} className="flex gap-2">
              <span className="font-mono" style={{ color: "#71717a" }}>
                {numbered[1]}.
              </span>
              <span>{renderInline(numbered[2])}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

export function WispTradeChat(props: {
  context: TradeContext;
  availableSymbols?: string[];
  onPickSymbol?: (symbol: string) => void;
}) {
  const { context, availableSymbols = [], onPickSymbol } = props;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => [
    {
      id: crypto.randomUUID(),
      role: "wisp",
      text: "gm. I’m watching your paper terminal. Ask me about the chart, indicators, or your last trade.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const title = useMemo(() => context.symbol ?? "Trade", [context.symbol]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(frame);
  }, [msgs, loading, open]);

  const mood = useMemo<WispMood>(() => {
    if (loading) return "thinking";
    if (open) return "happy";
    const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.text?.toLowerCase() ?? "";
    if (!lastUser) return "mischief";
    if (lastUser.includes("?")) return "thinking";
    if (lastUser.includes("gm") || lastUser.includes("hello") || lastUser.includes("hi")) return "happy";
    if (lastUser.includes("lol") || lastUser.includes("lmao") || lastUser.includes("haha")) return "mischief";
    return "idle";
  }, [loading, open, msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const mine: Msg = { id: crypto.randomUUID(), role: "user", text };
    setMsgs((p) => [...p, mine]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/wisp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context }),
      });
      const json = (await res.json()) as {
        reply?: string;
        error?: string;
        requestedMarket?: {
          symbol: string;
          name: string;
          interval: string;
          recentCandles: MiniCandle[];
        } | null;
      };
      if (!res.ok) throw new Error(json.error ?? "AI failed");
      const rawReply = (json.reply ?? "").trim() || "…I blanked. Ask again?";
      const parsed = parseWispActions(rawReply);
      const requestedCandles =
        json.requestedMarket?.recentCandles && json.requestedMarket.recentCandles.length > 5
          ? json.requestedMarket.recentCandles
          : undefined;

      if (parsed.switchSymbol && onPickSymbol) {
        const ok =
          availableSymbols.length === 0
            ? true
            : availableSymbols.some((s) => s.toUpperCase() === parsed.switchSymbol);
        if (ok) onPickSymbol(parsed.switchSymbol);
      }

      setMsgs((p) => [
        ...p,
        {
          id: crypto.randomUUID(),
          role: "wisp",
          text: parsed.cleaned,
          showChart: parsed.showChart || Boolean(requestedCandles),
          chartCandles: requestedCandles,
          chartSymbol: json.requestedMarket?.symbol,
        },
      ]);
    } catch {
      setMsgs((p) => [...p, { id: crypto.randomUUID(), role: "wisp", text: "I’m rate-limited / offline. Try again in a bit." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[120] w-[76px] h-[76px] rounded-[28px] flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 30% 25%, rgba(167,139,250,0.22), rgba(13,16,32,0.88) 55%, rgba(13,16,32,0.98) 100%)",
          boxShadow: "0 22px 60px rgba(0,0,0,0.62), 0 0 90px rgba(167,139,250,0.16)",
        }}
        animate={{ y: [0, -4, 0], boxShadow: [
          "0 22px 60px rgba(0,0,0,0.62), 0 0 90px rgba(167,139,250,0.14)",
          "0 26px 70px rgba(0,0,0,0.66), 0 0 110px rgba(167,139,250,0.22)",
          "0 22px 60px rgba(0,0,0,0.62), 0 0 90px rgba(167,139,250,0.14)",
        ]}}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.98 }}
        aria-label="Open Wisp chat"
      >
        <WispMascot size={40} mood={mood} />
      </motion.button>

      {/* Chat drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[140]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.55)" }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              className="absolute bottom-6 right-6 w-[460px] max-w-[94vw] h-[72vh] max-h-[820px] min-h-[560px] rounded-[32px] overflow-hidden flex flex-col"
              style={{
                background: "rgba(11,13,26,0.96)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.65)",
              }}
              initial={{ y: 18, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 18, scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
            >
              {/* Header */}
              <div
                className="px-5 py-4 flex items-center gap-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div style={{ width: 30, height: 38, position: "relative" }}>
                  <WispMascot size={30} mood={loading ? "thinking" : mood} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: "#e4e4e7", fontSize: 13 }}>
                    Wisp
                  </p>
                  <p className="font-mono truncate" style={{ color: "#3f3f46", fontSize: 11 }}>
                    {title} · paper help
                  </p>
                </div>
                <motion.button
                  onClick={() => setOpen(false)}
                  className="ml-auto w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ color: "#52525b" }}
                  whileHover={{ background: "rgba(255,255,255,0.05)", color: "#a1a1aa" }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Close chat"
                >
                  <X size={16} />
                </motion.button>
              </div>

              {/* Messages */}
              <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3" aria-live="polite">
                {context.recentCandles && context.recentCandles.length > 5 && (
                  <div className="mb-2">
                    <MiniCandleViz
                      candles={context.recentCandles}
                      fills={context.paper?.latestFills ?? []}
                      height={140}
                    />
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1" style={{ fontSize: 11, color: "#52525b" }}>
                      {typeof context.indicatorValues?.rsi14 === "number" && (
                        <span className="font-mono">
                          RSI14 <span style={{ color: "#a78bfa" }}>{context.indicatorValues.rsi14.toFixed(1)}</span>
                        </span>
                      )}
                      {context.indicatorValues?.macd && (
                        <span className="font-mono">
                          MACD{" "}
                          <span style={{ color: "#38bdf8" }}>{context.indicatorValues.macd.macd.toFixed(3)}</span>{" "}
                          <span style={{ color: "#a1a1aa" }}>/</span>{" "}
                          <span style={{ color: "#fbbf24" }}>{context.indicatorValues.macd.signal.toFixed(3)}</span>{" "}
                          <span style={{ color: "#3f3f46" }}>
                            ({context.indicatorValues.macd.hist >= 0 ? "+" : ""}
                            {context.indicatorValues.macd.hist.toFixed(3)})
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {msgs.map((m) => (
                  <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div style={{ maxWidth: "85%" }}>
                      {m.role === "wisp" && m.showChart && (m.chartCandles ?? context.recentCandles) && (m.chartCandles ?? context.recentCandles)!.length > 5 && (
                        <div className="mb-2">
                          {m.chartSymbol && (
                            <div className="mb-1.5 px-1 font-mono text-[10px]" style={{ color: "#71717a" }}>
                              {m.chartSymbol} live candles
                            </div>
                          )}
                          <MiniCandleViz
                            candles={(m.chartCandles ?? context.recentCandles)!}
                            fills={context.paper?.latestFills ?? []}
                            height={150}
                          />
                        </div>
                      )}
                      <div
                        className="px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed"
                        style={{
                          background: m.role === "user" ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          color: m.role === "user" ? "#dbeafe" : "#a1a1aa",
                        }}
                      >
                        {m.role === "wisp" ? <Prose text={m.text} /> : m.text}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div
                      className="px-3.5 py-2.5 rounded-2xl text-[14px]"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#52525b" }}
                    >
                      thinking…
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div
                  className="flex items-end gap-2 rounded-2xl px-3.5 py-2.5"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.15)" }}
                >
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about the chart, RSI, your trade…"
                    rows={1}
                    className="flex-1 resize-none bg-transparent outline-none text-[14px]"
                    style={{ color: "#e4e4e7" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <motion.button
                    onClick={() => void send()}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{
                      background: input.trim() ? "rgba(139,92,246,0.22)" : "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: input.trim() ? "#c4b5fd" : "#3f3f46",
                    }}
                    whileHover={input.trim() ? { background: "rgba(139,92,246,0.28)" } : {}}
                    whileTap={{ scale: 0.98 }}
                    aria-label="Send"
                    disabled={!input.trim() || loading}
                  >
                    <Send size={18} />
                  </motion.button>
                </div>
                <p className="mt-2 text-center" style={{ fontSize: 10, color: "#27272a" }}>
                  Paper-only. No financial advice.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

