"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef } from "react";
import WispMascot, { WispMood } from "./WispMascot";
import { TrendingUp, Brain, FlaskConical, BarChart3 } from "lucide-react";

/* ── Mini floating UI elements per feature ── */

function MiniPortfolioCard() {
  return (
    <motion.div
      className="rounded-2xl p-4 w-52"
      style={{
        background: "rgba(13,13,31,0.85)",
        border: "1px solid rgba(167,139,250,0.2)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 0 40px rgba(124,58,237,0.12)",
      }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="text-[10px] text-slate-500 mb-2 font-semibold tracking-wider uppercase">Total portfolio</div>
      <div className="text-2xl font-black text-white mb-1">$21,220</div>
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-emerald-400 font-semibold">↑ +$892</span>
        <span className="text-[10px] text-slate-600">today</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {[
          { name: "Kamino", val: "$4,230", w: "55%" },
          { name: "Jupiter", val: "$8,140", w: "75%" },
          { name: "Drift", val: "$2,050", w: "35%" },
        ].map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-16 h-1 rounded-full bg-[#1a1a2e] overflow-hidden flex-shrink-0">
              <motion.div
                className="h-full rounded-full bg-violet-500"
                style={{ width: p.w }}
                initial={{ width: 0 }}
                whileInView={{ width: p.w }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              />
            </div>
            <span className="text-[10px] text-slate-500">{p.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function MiniAICard() {
  return (
    <motion.div
      className="rounded-2xl p-4 w-56"
      style={{
        background: "rgba(13,13,31,0.85)",
        border: "1px solid rgba(167,139,250,0.2)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 0 40px rgba(124,58,237,0.12)",
      }}
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-violet-600/30 flex items-center justify-center">
          <Brain size={12} className="text-violet-400" />
        </div>
        <span className="text-[10px] text-violet-400 font-semibold">Wisp AI</span>
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      {[
        { txt: "Drift position 68% to liq.", warn: true },
        { txt: "Jupiter APY up 4.2% today", warn: false },
        { txt: "Add $200 margin to stay safe", warn: false },
      ].map((msg, i) => (
        <motion.div
          key={i}
          className="text-[11px] py-1.5 border-b border-violet-900/20 last:border-0"
          style={{ color: msg.warn ? "#fca5a5" : "#94a3b8" }}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 + i * 0.15 }}
        >
          {msg.warn && <span className="text-red-400 mr-1">⚠</span>}{msg.txt}
        </motion.div>
      ))}
    </motion.div>
  );
}

function MiniBacktestCard() {
  const bars = [40, 55, 35, 65, 50, 75, 60, 85, 70, 90, 78, 95];
  return (
    <motion.div
      className="rounded-2xl p-4 w-52"
      style={{
        background: "rgba(13,13,31,0.85)",
        border: "1px solid rgba(167,139,250,0.2)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 0 40px rgba(124,58,237,0.12)",
      }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Backtest — 90d</span>
        <span className="text-[11px] text-emerald-400 font-bold">+142%</span>
      </div>
      <div className="flex items-end gap-0.5 h-14">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-sm bg-violet-600/70"
            style={{ height: `${h}%` }}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 + i * 0.04, ease: "easeOut" }}
          />
        ))}
      </div>
      <div className="mt-2 text-[10px] text-slate-600">vs benchmark +38%</div>
    </motion.div>
  );
}

function MiniPaperCard() {
  return (
    <motion.div
      className="rounded-2xl p-4 w-52"
      style={{
        background: "rgba(13,13,31,0.85)",
        border: "1px solid rgba(0,255,163,0.15)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 0 40px rgba(0,255,163,0.08)",
      }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Paper Trade</span>
        <span className="text-[10px] text-slate-500">Simulated</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-500">Action</span>
          <span className="text-slate-300 font-semibold">Long SOL ×3</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-500">Entry</span>
          <span className="text-slate-300 font-semibold">$142.40</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-500">P&L</span>
          <span className="text-emerald-400 font-bold">+$1,840 🎉</span>
        </div>
      </div>
      <div className="mt-3 text-[10px] text-slate-600 italic">0 real $ at risk</div>
    </motion.div>
  );
}

/* ── Feature row data ── */

const features = [
  {
    num: "01",
    title: ["Portfolio", "Tracking"],
    tag: "Live on-chain",
    desc: "See every position across Kamino, Jupiter, Drift, Orca and more in one dashboard. No more juggling 7 tabs.",
    mood: "happy" as WispMood,
    quote: "gm ser 👋",
    card: <MiniPortfolioCard />,
    flip: false,
  },
  {
    num: "02",
    title: ["AI-Powered", "Insights"],
    tag: "Actually smart",
    desc: "Wisp reads your liquidation proximity, APY decay, funding rates and concentration risk — then tells you exactly what to do.",
    mood: "thinking" as WispMood,
    quote: "i see ur bags 👀",
    card: <MiniAICard />,
    flip: true,
  },
  {
    num: "03",
    title: ["Strategy", "Backtesting"],
    tag: "Historical data",
    desc: "Run any strategy against 2 years of real DeFi data. See the win rate, max drawdown, and whether it would've actually worked.",
    mood: "mischief" as WispMood,
    quote: "data goes brrrr 📊",
    card: <MiniBacktestCard />,
    flip: false,
  },
  {
    num: "04",
    title: ["Paper", "Trading"],
    tag: "Zero risk",
    desc: "Simulate live trades with real market conditions. Build conviction before you put a single dollar on the line.",
    mood: "rich" as WispMood,
    quote: "0 risk is my fav risk 😎",
    card: <MiniPaperCard />,
    flip: true,
  },
];

function FeatureRow({ feat, index }: { feat: typeof features[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div ref={ref} className="relative">
      {/* Divider */}
      <motion.div
        className="w-full h-px"
        style={{ background: "rgba(255,255,255,0.06)" }}
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      <div className={`flex flex-col lg:flex-row items-center gap-10 lg:gap-0 py-16 lg:py-24 px-0 ${feat.flip ? "lg:flex-row-reverse" : ""}`}>
        {/* Ghost number */}
        <span
          className="hidden lg:block absolute font-black pointer-events-none select-none"
          style={{
            fontSize: "clamp(80px, 12vw, 160px)",
            color: "rgba(255,255,255,0.03)",
            [feat.flip ? "right" : "left"]: 0,
            top: "50%",
            transform: "translateY(-50%)",
            lineHeight: 1,
          }}
        >
          {feat.num}
        </span>

        {/* Text column */}
        <motion.div
          className="flex-1 lg:px-16"
          initial={{ opacity: 0, x: feat.flip ? 40 : -40 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.25,0.1,0.25,1] }}
        >
          <div className="flex items-center gap-3 mb-5">
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#52525b" }}>{feat.num}</span>
            <div className="h-px flex-1 max-w-12" style={{ background: "rgba(255,255,255,0.08)" }} />
            <span
              className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full"
              style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.18)" }}
            >
              {feat.tag}
            </span>
          </div>

          <h3
            className="font-extrabold tracking-[-0.025em] leading-[0.95] mb-6"
            style={{ fontSize: "clamp(38px, 5.5vw, 68px)", color: "#fafafa" }}
          >
            {feat.title[0]}
            <br />
            <span style={{ background: "linear-gradient(120deg,#ffffff,#b4a8f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{feat.title[1]}</span>
          </h3>

          <p style={{ color: "#71717a", lineHeight: 1.7, maxWidth: 340, fontSize: "clamp(14px, 1.4vw, 16px)" }}>
            {feat.desc}
          </p>
        </motion.div>

        {/* Wisp + card column */}
        <motion.div
          className="flex-1 flex items-center justify-center gap-6 lg:gap-8"
          initial={{ opacity: 0, x: feat.flip ? -40 : 40 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.25,0.1,0.25,1] }}
        >
          <WispMascot size={150} mood={feat.mood} quote={feat.quote} />
          <div className="hidden sm:block">{feat.card}</div>
        </motion.div>
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8b5cf6" }}>
            What Wisp does
          </span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="font-extrabold tracking-[-0.025em] leading-[1] mb-20"
          style={{ fontSize: "clamp(32px, 5vw, 58px)", color: "#fafafa" }}
        >
          DeFi intel,{" "}
          <span style={{ background: "linear-gradient(120deg,#ffffff,#b4a8f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>actually useful</span>
        </motion.h2>

        {/* Feature rows */}
        {features.map((f, i) => (
          <FeatureRow key={f.num} feat={f} index={i} />
        ))}

        {/* Final divider */}
        <div className="w-full h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
    </section>
  );
}
