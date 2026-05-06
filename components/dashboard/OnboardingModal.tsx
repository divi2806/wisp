"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BarChart2,
  ShoppingBag,
  MessageSquare,
  Zap,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import WispMascot, { WispMood } from "@/components/WispMascot";

const STORAGE_KEY = "wisp_onboarded_v1";

const steps = [
  {
    id: "welcome",
    icon: null,
    mood: "excited" as WispMood,
    quote: "gm fren! 👋",
    title: "Welcome to Wisp",
    subtitle: "Your AI co-pilot for Solana DeFi",
    body: "Wisp unifies your entire Solana DeFi portfolio, alerts you to risks before they become losses, and gives you the tools to backtest and trade — all with read-only wallet access. Let's walk through what you can do.",
    accent: "#8b5cf6",
    accentBg: "rgba(139,92,246,0.08)",
    accentBorder: "rgba(139,92,246,0.2)",
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    mood: "happy" as WispMood,
    quote: "ur bags, unified 💼",
    title: "Portfolio Dashboard",
    subtitle: "Every position. One screen.",
    body: "See your total portfolio value, per-position APY, 24h P&L, risk scores, and sparklines across Kamino, Jupiter, Drift, Orca, Marinade — all aggregated via Helius RPC in under 100ms. No more juggling 7 tabs.",
    accent: "#22c55e",
    accentBg: "rgba(34,197,94,0.08)",
    accentBorder: "rgba(34,197,94,0.2)",
  },
  {
    id: "backtest",
    icon: BarChart2,
    mood: "thinking" as WispMood,
    quote: "data goes brrrr 📊",
    title: "Backtest",
    subtitle: "Know your edge before risking capital.",
    body: "Run any strategy against 2 years of real Solana DeFi historical data. See the exact P&L curve, maximum drawdown, Sharpe ratio, and benchmark comparison. Validate before you deploy.",
    accent: "#a78bfa",
    accentBg: "rgba(167,139,250,0.08)",
    accentBorder: "rgba(167,139,250,0.22)",
  },
  {
    id: "marketplace",
    icon: ShoppingBag,
    mood: "rich" as WispMood,
    quote: "copy the best 😎",
    title: "Marketplace",
    subtitle: "Proven strategies, one click away.",
    body: "Browse battle-tested DeFi strategies curated by top Solana traders. Filter by protocol, risk level, and historical returns. Deploy directly to paper trading or go live when you're ready.",
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,0.08)",
    accentBorder: "rgba(245,158,11,0.2)",
  },
  {
    id: "chat",
    icon: MessageSquare,
    mood: "mischief" as WispMood,
    quote: "i see ur bags 👀",
    title: "Chat",
    subtitle: "Ask Wisp anything about your portfolio.",
    body: "Get AI-powered insights in plain English. Ask about your liquidation risk, yield optimization, funding rates, or what happened to your portfolio in the last 30 days. Wisp knows the protocols.",
    accent: "#38bdf8",
    accentBg: "rgba(56,189,248,0.08)",
    accentBorder: "rgba(56,189,248,0.2)",
  },
  {
    id: "trade",
    icon: Zap,
    mood: "excited" as WispMood,
    quote: "0 risk is my fav risk 🚀",
    title: "Trade",
    subtitle: "Test live. Execute with confidence.",
    body: "Simulate live trades in real market conditions with zero real capital at risk. When you're confident in your strategy, execute directly. Wisp handles position sizing, slippage estimation, and post-trade tracking.",
    accent: "#34d399",
    accentBg: "rgba(52,211,153,0.08)",
    accentBorder: "rgba(52,211,153,0.2)",
  },
];

export default function OnboardingModal() {
  const [visible, setVisible] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      return !localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setVisible(false);
  };

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const IconComp = current.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: "rgba(4,5,12,0.8)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
            onClick={dismiss}
          />

          {/* Card */}
          <motion.div
            className="relative z-10 w-full flex flex-col overflow-hidden"
            style={{
              maxWidth: 460,
              background: "rgba(11,13,26,0.97)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 28,
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.04), 0 40px 100px rgba(0,0,0,0.65), 0 0 80px rgba(91,33,182,0.14)",
            }}
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            {/* Close */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 z-20 flex items-center justify-center w-7 h-7 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)", color: "#52525b" }}
            >
              <X size={13} />
            </button>

            {/* Step progress bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: current.accent }}
                animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>

            {/* Content */}
            <div className="px-8 pt-10 pb-8">
              {/* Wisp + icon row */}
              <div className="flex items-end justify-center gap-4 mb-7">
                <WispMascot size={90} mood={current.mood} quote={current.quote} />
                {IconComp && (
                  <motion.div
                    key={current.id + "-icon"}
                    initial={{ opacity: 0, scale: 0.6, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.12, type: "spring", stiffness: 300, damping: 20 }}
                    className="flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
                    style={{
                      background: current.accentBg,
                      border: `1px solid ${current.accentBorder}`,
                    }}
                  >
                    <IconComp size={24} color={current.accent} strokeWidth={1.8} />
                  </motion.div>
                )}
              </div>

              {/* Text */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: direction * 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -30 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <p
                    className="text-center mb-1 font-semibold tracking-wide uppercase"
                    style={{ fontSize: 10, color: current.accent, letterSpacing: "0.18em" }}
                  >
                    {current.subtitle}
                  </p>
                  <h2
                    className="text-center font-extrabold tracking-[-0.025em] mb-4"
                    style={{
                      fontSize: 24,
                      background: "linear-gradient(120deg, #ffffff, #b4a8f0)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {current.title}
                  </h2>
                  <p
                    className="text-center leading-relaxed"
                    style={{ fontSize: 14, color: "#71717a", lineHeight: 1.7 }}
                  >
                    {current.body}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Step dots */}
              <div className="flex items-center justify-center gap-1.5 mt-7 mb-7">
                {steps.map((_, i) => (
                  <button key={i} onClick={() => go(i)}>
                    <motion.div
                      className="rounded-full"
                      animate={{
                        width: i === step ? 20 : 6,
                        background: i === step ? current.accent : "rgba(255,255,255,0.12)",
                        height: 6,
                      }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    />
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-3">
                {!isFirst && (
                  <motion.button
                    onClick={() => go(step - 1)}
                    className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#71717a",
                    }}
                    whileHover={{ background: "rgba(255,255,255,0.09)", color: "#a1a1aa" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ChevronLeft size={16} />
                  </motion.button>
                )}

                <motion.button
                  onClick={isLast ? dismiss : () => go(step + 1)}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl font-semibold text-sm"
                  style={{
                    background: current.accentBg,
                    border: `1px solid ${current.accentBorder}`,
                    color: current.accent,
                  }}
                  whileHover={{
                    background: isLast
                      ? "rgba(139,92,246,0.2)"
                      : current.accentBg.replace("0.08", "0.14"),
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isLast ? (
                    "Let's go →"
                  ) : (
                    <>
                      Next
                      <ChevronRight size={14} />
                    </>
                  )}
                </motion.button>
              </div>

              {isFirst && (
                <button
                  onClick={dismiss}
                  className="w-full mt-3 text-center"
                  style={{ fontSize: 12, color: "#3f3f46" }}
                >
                  Skip tour
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
