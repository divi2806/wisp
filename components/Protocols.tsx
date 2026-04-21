"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import WispMascot from "./WispMascot";

const row1 = [
  { name: "Kamino",   cat: "Lending & Yield" },
  { name: "Jupiter",  cat: "DEX & Perps" },
  { name: "Drift",    cat: "Perpetuals" },
  { name: "Orca",     cat: "AMM" },
  { name: "Raydium",  cat: "AMM & Launchpad" },
  { name: "Marinade", cat: "Liquid Staking" },
  { name: "Marginfi", cat: "Money Market" },
  { name: "Jito",     cat: "MEV & Staking" },
  { name: "Sanctum",  cat: "LST Liquidity" },
  { name: "Zeta",     cat: "Options & Perps" },
];

const stats = [
  { value: "$2.4B+", label: "Tracked TVL" },
  { value: "12+",    label: "Protocols live" },
  { value: "<100ms", label: "Data latency" },
  { value: "24/7",   label: "Monitoring" },
];

function ProtocolPill({ name, cat }: { name: string; cat: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-full flex-shrink-0"
      style={{
        background: "rgba(16,16,22,0.85)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" style={{ boxShadow: "0 0 4px #00ffa3" }} />
      <span className="text-sm font-semibold text-slate-200 whitespace-nowrap">{name}</span>
      <span className="text-xs text-slate-600 whitespace-nowrap hidden sm:block">{cat}</span>
    </div>
  );
}

export default function Protocols() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  // Duplicate for seamless loop
  const track1 = [...row1, ...row1, ...row1];
  const track2 = [...row1, ...row1, ...row1];

  return (
    <section id="protocols" className="relative py-28 overflow-hidden">
      {/* Subtle grid */}
      <div className="absolute inset-0 grid-bg opacity-25 pointer-events-none" />

      {/* Purple wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(124,58,237,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8b5cf6" }} className="block mb-4">
            Integrations
          </span>
          <h2
            className="font-extrabold tracking-[-0.025em] leading-[1.05] mb-4"
            style={{ fontSize: "clamp(28px, 4.5vw, 52px)", color: "#fafafa" }}
          >
            Every protocol.{" "}
            <span style={{ background: "linear-gradient(120deg,#ffffff,#b4a8f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>One dashboard.</span>
          </h2>
          <p style={{ color: "#71717a", fontSize: 15 }} className="max-w-md mx-auto">
            Wisp reads your on-chain positions across the entire Solana DeFi stack — live.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-16 overflow-hidden rounded-2xl"
          style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.06)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="text-center py-6 px-4"
              style={{ background: "var(--bg)" }}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.08 }}
            >
              <div
                className="font-extrabold tracking-[-0.03em] mb-1"
                style={{ fontSize: "clamp(22px, 3vw, 38px)", color: "#fafafa" }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: "#52525b", fontWeight: 500, letterSpacing: "0.05em" }}>{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Marquee — full bleed */}
      <div className="relative overflow-hidden mb-4">
        {/* Left/right fade masks */}
        <div
          className="absolute inset-y-0 left-0 w-32 z-10 pointer-events-none"
          style={{ background: "linear-gradient(90deg, #080b14 0%, transparent 100%)" }}
        />
        <div
          className="absolute inset-y-0 right-0 w-32 z-10 pointer-events-none"
          style={{ background: "linear-gradient(270deg, #080b14 0%, transparent 100%)" }}
        />

        {/* Row 1 — scrolls left */}
        <div
          className="flex gap-3 py-2"
          style={{ width: "max-content", animation: "marquee-left 30s linear infinite" }}
        >
          {track1.map((p, i) => (
            <ProtocolPill key={i} name={p.name} cat={p.cat} />
          ))}
        </div>
      </div>

      {/* Row 2 — scrolls right */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 w-32 z-10 pointer-events-none"
          style={{ background: "linear-gradient(90deg, #080b14 0%, transparent 100%)" }}
        />
        <div
          className="absolute inset-y-0 right-0 w-32 z-10 pointer-events-none"
          style={{ background: "linear-gradient(270deg, #080b14 0%, transparent 100%)" }}
        />
        <div
          className="flex gap-3 py-2"
          style={{ width: "max-content", animation: "marquee-right 28s linear infinite" }}
        >
          {track2.map((p, i) => (
            <ProtocolPill key={i} name={p.name} cat={p.cat} />
          ))}
        </div>
      </div>

      {/* Wisp peeking + footer note */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 mt-12 flex items-center justify-between">
        <p style={{ fontSize: 13, color: "#3f3f46" }}>
          + more coming: <span style={{ color: "#8b5cf6" }}>Tensor, Phoenix, Lifinity...</span>
        </p>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 12, color: "#3f3f46", fontStyle: "italic" }}>Wisp is watching all of them</span>
          <WispMascot size={52} mood="mischief" />
        </div>
      </div>
    </section>
  );
}
