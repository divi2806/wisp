"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X } from "lucide-react";
import WispMascot, { type WispMood } from "@/components/WispMascot";
import { MiniCandleViz } from "@/components/trade/MiniCandleViz";

type Msg = { id: string; role: "user" | "wisp"; text: string };

export type TradeContext = {
  symbol?: string;
  interval?: string;
  candleType?: string;
  indicators?: Record<string, boolean>;
  livePrice?: number | null;
  recentCandles?: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>;
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

export function WispTradeChat(props: { context: TradeContext }) {
  const { context } = props;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    {
      id: crypto.randomUUID(),
      role: "wisp",
      text: "gm. I’m watching your paper terminal. Ask me about the chart, indicators, or your last trade.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  const title = useMemo(() => context.symbol ?? "Trade", [context.symbol]);

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
      const json = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "AI failed");
      const reply = (json.reply ?? "").trim() || "…I blanked. Ask again?";
      setMsgs((p) => [...p, { id: crypto.randomUUID(), role: "wisp", text: reply }]);
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
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
              <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
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
                    <div
                      className="px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed"
                      style={{
                        maxWidth: "85%",
                        background: m.role === "user" ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: m.role === "user" ? "#dbeafe" : "#a1a1aa",
                      }}
                    >
                      {m.text}
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

