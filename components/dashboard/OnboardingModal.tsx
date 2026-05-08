"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  BarChart2,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Hexagon,
  MessageSquare,
  MousePointer2,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import WispMascot, { WispMood } from "@/components/WispMascot";

const STORAGE_KEY = "wisp_product_tour_v2";

type DeckStep = {
  id: string;
  icon: typeof Sparkles;
  mood: WispMood;
  title: string;
  subtitle: string;
  body: string;
  points: string[];
  accent: string;
  accentBg: string;
  accentBorder: string;
};

type TourStep = {
  id: string;
  targetId: string;
  icon: typeof Sparkles;
  title: string;
  body: string;
  accent: string;
};

const deckSteps: DeckStep[] = [
  {
    id: "welcome",
    icon: Sparkles,
    mood: "excited",
    title: "Welcome to Wisp",
    subtitle: "Your Solana DeFi control room",
    body: "Wisp helps you understand wallets, yields, token risk, perps, paper trading, and prediction markets from one workspace.",
    points: ["Ask in plain English", "See visual cards when useful", "Use public and connected wallet data"],
    accent: "#a78bfa",
    accentBg: "rgba(167,139,250,0.10)",
    accentBorder: "rgba(167,139,250,0.26)",
  },
  {
    id: "wallet",
    icon: Wallet,
    mood: "happy",
    title: "Connect Once, Read Safely",
    subtitle: "Read-only first",
    body: "After connecting, Wisp can use your public address to summarize holdings and protocol exposure. It does not move funds without a future signed transaction flow.",
    points: ["SOL and SPL balances", "Protocol position checks", "Copy, inspect, or disconnect anytime"],
    accent: "#22c55e",
    accentBg: "rgba(34,197,94,0.10)",
    accentBorder: "rgba(34,197,94,0.24)",
  },
  {
    id: "intelligence",
    icon: Bot,
    mood: "thinking",
    title: "Ask Wisp Anything",
    subtitle: "Frank DeFi intelligence",
    body: "Use chat for best yields, token risk, wallet lookups, perps context, protocol APIs, and strategy explanations. Wisp stays precise and calls out missing live data.",
    points: ["Yield rankings", "Token risk scorecards", "Wallet and protocol context"],
    accent: "#38bdf8",
    accentBg: "rgba(56,189,248,0.10)",
    accentBorder: "rgba(56,189,248,0.24)",
  },
  {
    id: "simulate",
    icon: TrendingUp,
    mood: "mischief",
    title: "Practice Before Risk",
    subtitle: "Paper trade and event markets",
    body: "Use Trade and Prediction Market to test ideas against live price movement without risking capital. Wisp sits beside those panels for context.",
    points: ["Paper spot trading", "BTC/SOL prediction markets", "Realtime market context"],
    accent: "#fb7185",
    accentBg: "rgba(251,113,133,0.10)",
    accentBorder: "rgba(251,113,133,0.24)",
  },
];

const tourSteps: TourStep[] = [
  {
    id: "workspace",
    targetId: "workspace",
    icon: Hexagon,
    title: "Workspace",
    body: "This center area changes by section. Dashboard summarizes, Chat answers, Trade simulates, and Prediction Market runs event-style paper markets.",
    accent: "#a78bfa",
  },
  {
    id: "wallet",
    targetId: "wallet-connect",
    icon: Wallet,
    title: "Wallet Connect",
    body: "Connect a Solana wallet here. The dropdown lets you copy the address, open Solscan, or disconnect.",
    accent: "#22c55e",
  },
  {
    id: "dashboard",
    targetId: "sidebar-dashboard",
    icon: Hexagon,
    title: "Dashboard",
    body: "Your portfolio home. This is where wallet-level summaries and high-level DeFi health belong.",
    accent: "#a78bfa",
  },
  {
    id: "chat",
    targetId: "sidebar-chat",
    icon: MessageSquare,
    title: "Chat",
    body: "Ask Wisp about yields, wallets, token risk, perps, protocol positions, APIs, and strategy ideas.",
    accent: "#38bdf8",
  },
  {
    id: "backtest",
    targetId: "sidebar-backtest",
    icon: BarChart2,
    title: "Backtest",
    body: "Use this section to validate strategy logic before putting real capital behind it.",
    accent: "#818cf8",
  },
  {
    id: "marketplace",
    targetId: "sidebar-marketplace",
    icon: ShoppingBag,
    title: "Marketplace",
    body: "Browse and compare strategies. This is the future surface for curated DeFi playbooks.",
    accent: "#fbbf24",
  },
  {
    id: "prediction",
    targetId: "sidebar-prediction-market",
    icon: TrendingUp,
    title: "Prediction Market",
    body: "Paper trade BTC and SOL 5m/15m event markets with realtime price movement and Wisp beside the book.",
    accent: "#fb7185",
  },
  {
    id: "trade",
    targetId: "sidebar-trade",
    icon: RefreshCw,
    title: "Trade",
    body: "Practice paper trades on token charts. It is built for trying entries, exits, and sizing before real execution.",
    accent: "#34d399",
  },
];

function setSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {}
}

function getSeen() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return true;
  }
}

function getTargetRect(targetId: string) {
  const el = document.querySelector(`[data-tour-id="${targetId}"]`);
  if (!el) return null;

  const raw = el.getBoundingClientRect();
  const pad = targetId === "workspace" ? 10 : 8;
  return {
    top: Math.max(10, raw.top - pad),
    left: Math.max(10, raw.left - pad),
    width: Math.min(window.innerWidth - 20, raw.width + pad * 2),
    height: Math.min(window.innerHeight - 20, raw.height + pad * 2),
  };
}

function tooltipStyle(rect: ReturnType<typeof getTargetRect>): CSSProperties {
  if (typeof window === "undefined") {
    return {
      left: "50%",
      top: "50%",
      width: 380,
      transform: "translate(-50%, -50%)",
    };
  }

  const width = Math.min(380, window.innerWidth - 32);
  if (!rect) {
    return {
      left: "50%",
      top: "50%",
      width,
      transform: "translate(-50%, -50%)",
    };
  }

  const gap = 16;
  const canRight = rect.left + rect.width + gap + width < window.innerWidth - 16;
  const canLeft = rect.left - gap - width > 16;
  const top = Math.min(Math.max(16, rect.top), window.innerHeight - 250);

  if (canRight) return { left: rect.left + rect.width + gap, top, width };
  if (canLeft) return { left: rect.left - gap - width, top, width };

  const belowTop = rect.top + rect.height + gap;
  const useBelow = belowTop + 230 < window.innerHeight;
  return {
    left: Math.min(Math.max(16, rect.left), window.innerWidth - width - 16),
    top: useBelow ? belowTop : Math.max(16, rect.top - 246),
    width,
  };
}

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"deck" | "tour">("deck");
  const [deckIndex, setDeckIndex] = useState(0);
  const [tourIndex, setTourIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [targetRect, setTargetRect] = useState<ReturnType<typeof getTargetRect>>(null);

  useEffect(() => {
    if (!getSeen()) {
      const timeout = window.setTimeout(() => setVisible(true), 500);
      return () => window.clearTimeout(timeout);
    }
  }, []);

  const dismiss = useCallback(() => {
    setSeen();
    setVisible(false);
  }, []);

  const refreshTarget = useCallback(() => {
    if (phase !== "tour") return;
    const step = tourSteps[tourIndex];
    window.requestAnimationFrame(() => setTargetRect(getTargetRect(step.targetId)));
  }, [phase, tourIndex]);

  useEffect(() => {
    refreshTarget();
  }, [refreshTarget]);

  useEffect(() => {
    if (phase !== "tour") return;
    window.addEventListener("resize", refreshTarget);
    window.addEventListener("scroll", refreshTarget, true);
    return () => {
      window.removeEventListener("resize", refreshTarget);
      window.removeEventListener("scroll", refreshTarget, true);
    };
  }, [phase, refreshTarget]);

  const deck = deckSteps[deckIndex];
  const isFirstDeck = deckIndex === 0;
  const isLastDeck = deckIndex === deckSteps.length - 1;
  const currentTour = tourSteps[tourIndex];
  const isFirstTour = tourIndex === 0;
  const isLastTour = tourIndex === tourSteps.length - 1;
  const DeckIcon = deck.icon;
  const TourIcon = currentTour.icon;
  const tipStyle = useMemo(() => tooltipStyle(targetRect), [targetRect]);

  const goDeck = (next: number) => {
    setDirection(next > deckIndex ? 1 : -1);
    setDeckIndex(next);
  };

  const startTour = () => {
    setPhase("tour");
    setTourIndex(0);
  };

  const goTour = (next: number) => {
    if (next < 0) {
      setPhase("deck");
      setDeckIndex(deckSteps.length - 1);
      return;
    }
    setTourIndex(next);
  };

  return (
    <AnimatePresence>
      {visible && phase === "deck" ? (
        <motion.div
          className="fixed inset-0 z-[210] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.button
            type="button"
            aria-label="Close onboarding"
            className="absolute inset-0 cursor-default"
            style={{
              background: "rgba(4,5,12,0.82)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
            onClick={dismiss}
          />

          <motion.div
            className="relative z-10 flex w-full max-w-[500px] flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0f1d]/98 shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-500 transition hover:bg-white/[0.08] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <X size={15} />
            </button>

            <div className="absolute left-0 right-0 top-0 h-0.5 bg-white/[0.05]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: deck.accent }}
                animate={{ width: `${((deckIndex + 1) / deckSteps.length) * 100}%` }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>

            <div className="px-7 pb-7 pt-9">
              <div className="mb-7 flex items-end justify-center gap-4">
                <WispMascot size={88} mood={deck.mood} />
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, scale: 0.7, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 320, damping: 22 }}
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    background: deck.accentBg,
                    border: `1px solid ${deck.accentBorder}`,
                  }}
                >
                  <DeckIcon size={24} color={deck.accent} strokeWidth={1.8} />
                </motion.div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, x: direction * 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -28 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: deck.accent }}>
                    {deck.subtitle}
                  </p>
                  <h2 className="mb-4 text-center text-2xl font-extrabold tracking-tight text-zinc-50">
                    {deck.title}
                  </h2>
                  <p className="mx-auto max-w-[410px] text-center text-sm leading-7 text-zinc-500">
                    {deck.body}
                  </p>

                  <div className="mt-6 grid gap-2">
                    {deck.points.map((point) => (
                      <div key={point} className="flex min-h-10 items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 text-sm text-zinc-300">
                        <Check size={15} style={{ color: deck.accent }} />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mb-6 mt-7 flex items-center justify-center gap-1.5">
                {deckSteps.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to intro slide ${i + 1}`}
                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                    onClick={() => goDeck(i)}
                  >
                    <motion.div
                      className="rounded-full"
                      animate={{
                        width: i === deckIndex ? 22 : 6,
                        height: 6,
                        background: i === deckIndex ? deck.accent : "rgba(255,255,255,0.14)",
                      }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {!isFirstDeck ? (
                  <button
                    type="button"
                    onClick={() => goDeck(deckIndex - 1)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-500 transition hover:bg-white/[0.08] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    <ChevronLeft size={16} />
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={isLastDeck ? startTour : () => goDeck(deckIndex + 1)}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  style={{
                    background: deck.accentBg,
                    borderColor: deck.accentBorder,
                    color: deck.accent,
                  }}
                >
                  {isLastDeck ? (
                    <>
                      Start product tour
                      <MousePointer2 size={15} />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight size={15} />
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={dismiss}
                className="mt-3 w-full text-center text-xs text-zinc-600 transition hover:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}

      {visible && phase === "tour" ? (
        <motion.div
          className="fixed inset-0 z-[210]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {targetRect ? (
            <motion.div
              className="pointer-events-none fixed rounded-2xl border-2"
              style={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height,
                borderColor: currentTour.accent,
                boxShadow: `0 0 0 9999px rgba(4,5,12,0.74), 0 0 42px ${currentTour.accent}55`,
              }}
              layout
              transition={{ type: "spring", stiffness: 330, damping: 34 }}
            />
          ) : (
            <div className="fixed inset-0 bg-[rgba(4,5,12,0.74)]" />
          )}

          <motion.div
            key={currentTour.id}
            className="fixed rounded-2xl border border-white/[0.08] bg-[#0b1020]/98 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.65)] backdrop-blur-xl"
            style={tipStyle}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    background: `${currentTour.accent}18`,
                    borderColor: `${currentTour.accent}44`,
                    color: currentTour.accent,
                  }}
                >
                  <TourIcon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                    Step {tourIndex + 1} of {tourSteps.length}
                  </p>
                  <h3 className="mt-0.5 text-base font-bold text-zinc-50">{currentTour.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-sm leading-6 text-zinc-400">{currentTour.body}</p>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => goTour(tourIndex - 1)}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-semibold text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <ChevronLeft size={14} />
                {isFirstTour ? "Deck" : "Back"}
              </button>

              <button
                type="button"
                onClick={isLastTour ? dismiss : () => goTour(tourIndex + 1)}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                style={{
                  background: `${currentTour.accent}18`,
                  borderColor: `${currentTour.accent}44`,
                  color: currentTour.accent,
                }}
              >
                {isLastTour ? (
                  <>
                    Finish tour
                    <ShieldCheck size={14} />
                  </>
                ) : (
                  <>
                    Next section
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              {tourSteps.map((item, index) => (
                <span
                  key={item.id}
                  className="h-1.5 rounded-full"
                  style={{
                    width: index === tourIndex ? 22 : 6,
                    background: index === tourIndex ? currentTour.accent : "rgba(255,255,255,0.14)",
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
