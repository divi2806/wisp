"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

/* ── Sparkline component ── */
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const w = 64, h = 26;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 3 - ((v - min) / range) * (h - 6),
  ]);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = line + ` L${w},${h} L0,${h} Z`;
  const color = positive ? "#22c55e" : "#f87171";
  const id = `sg-${positive ? "g" : "r"}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} overflow="visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <motion.path
        d={line}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
      />
    </svg>
  );
}

/* ── Portfolio area chart ── */
function AreaChart() {
  const data = [18200, 18900, 18300, 19600, 19100, 20400, 21220];
  const w = 100, h = 50;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h - 4) - 2,
  ]);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = line + ` L${w},${h} L0,${h} Z`;

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height: 56 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#areaFill)" />
        <motion.path
          d={line}
          stroke="#8b5cf6"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        {/* Endpoint dot */}
        <motion.circle
          cx={pts[pts.length - 1][0]}
          cy={pts[pts.length - 1][1]}
          r="1.2"
          fill="#a78bfa"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.4 }}
        />
      </svg>
      {/* Day labels */}
      <div className="flex justify-between mt-1 px-0.5">
        {labels.map((l) => (
          <span key={l} style={{ fontSize: 9, color: "#3f3f46" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Animated counter ── */
function Ticker({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(ease * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}

/* ── Risk dots ── */
function RiskDots({ level }: { level: "low" | "medium" | "high" }) {
  const count = { low: 1, medium: 2, high: 3 }[level];
  const color = { low: "#22c55e", medium: "#f59e0b", high: "#f87171" }[level];
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: i <= count ? color : "rgba(255,255,255,0.08)",
            boxShadow: i <= count ? `0 0 4px ${color}88` : "none",
          }}
        />
      ))}
    </div>
  );
}

/* ── Main component ── */
const positions = [
  {
    protocol: "Kamino",
    type: "USDC Vault",
    apy: "12.4",
    value: 4230,
    change: "+2.1%",
    positive: true,
    risk: "low" as const,
    spark: [4050, 4090, 4130, 4170, 4200, 4218, 4230],
  },
  {
    protocol: "Jupiter",
    type: "SOL-USDC LP",
    apy: "38.7",
    value: 8140,
    change: "+5.3%",
    positive: true,
    risk: "medium" as const,
    spark: [7200, 7450, 7620, 7820, 7940, 8060, 8140],
  },
  {
    protocol: "Drift",
    type: "SOL Perp ×3",
    apy: "—",
    value: 2050,
    change: "−3.2%",
    positive: false,
    risk: "high" as const,
    spark: [2410, 2360, 2290, 2210, 2160, 2090, 2050],
  },
  {
    protocol: "Marinade",
    type: "mSOL Stake",
    apy: "7.1",
    value: 6800,
    change: "+0.8%",
    positive: true,
    risk: "low" as const,
    spark: [6710, 6730, 6748, 6762, 6778, 6792, 6800],
  },
];

export default function PortfolioPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Very soft purple glow behind the card */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 800,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(109,40,217,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <span
            className="text-xs font-semibold tracking-[0.22em] uppercase block mb-3"
            style={{ color: "#8b5cf6" }}
          >
            Live dashboard
          </span>
          <h2
            className="font-extrabold tracking-tight leading-[1.02]"
            style={{ fontSize: "clamp(28px, 4.5vw, 52px)", color: "#fafafa" }}
          >
            See it in{" "}
            <span style={{ background: "linear-gradient(120deg,#ffffff,#b4a8f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>action</span>
          </h2>
        </motion.div>

        {/* Dashboard card */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "#0d0d14",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.4), 0 0 60px rgba(109,40,217,0.08)",
          }}
        >
          {/* Title bar */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#3f3f46" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#3f3f46" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#3f3f46" }} />
              </div>
              <span style={{ fontSize: 11, color: "#3f3f46", fontFamily: "var(--font-mono)", marginLeft: 8 }}>
                wisp.app/portfolio
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#22c55e" }}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>Live</span>
            </div>
          </div>

          <div className="p-5">
            {/* Stats row + chart */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {/* Left — main value + chart */}
              <div className="md:col-span-2 pb-5 md:pr-6 md:border-r" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-end justify-between mb-1">
                  <div>
                    <p style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                      Total Portfolio
                    </p>
                    <p className="font-extrabold tracking-tight" style={{ fontSize: 32, color: "#fafafa" }}>
                      $<Ticker value={21220} />
                    </p>
                  </div>
                  <motion.div
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path d="M1 7 L4 3 L7 5 L9 2" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>+$892 today</span>
                  </motion.div>
                </div>
                <AreaChart />
              </div>

              {/* Right — stats */}
              <div className="flex md:flex-col justify-between md:pl-6 pt-4 md:pt-0 pb-5 md:pb-0 gap-3">
                {[
                  { label: "Avg APY", value: "14.6%", sub: "Blended rate", color: "#22c55e" },
                  { label: "Risk Score", value: "6.2", sub: "Moderate risk", color: "#f59e0b" },
                ].map((s) => (
                  <div key={s.label} className="flex-1">
                    <p style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                      {s.label}
                    </p>
                    <p
                      className="font-extrabold tracking-tight"
                      style={{ fontSize: 26, color: s.color }}
                    >
                      {s.value}
                    </p>
                    <p style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Table */}
            <div>
              {/* Header row */}
              <div
                className="grid items-center px-3 py-2"
                style={{
                  gridTemplateColumns: "1.2fr 1.2fr 0.6fr 0.9fr 0.7fr 70px 50px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {["Protocol", "Position", "APY", "Value", "24h", "7-day", "Risk"].map((h) => (
                  <span key={h} style={{ fontSize: 10, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Data rows */}
              <div className="space-y-0">
                {positions.map((pos, i) => (
                  <motion.div
                    key={pos.protocol}
                    className="grid items-center px-3 py-3.5 cursor-pointer group"
                    style={{
                      gridTemplateColumns: "1.2fr 1.2fr 0.6fr 0.9fr 0.7fr 70px 50px",
                      borderBottom: "1px solid rgba(255,255,255,0.035)",
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    whileHover={{
                      background: "rgba(255,255,255,0.02)",
                      transition: { duration: 0.15 }
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7" }}>
                      {pos.protocol}
                    </span>
                    <span style={{ fontSize: 11, color: "#71717a" }}>{pos.type}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        color: pos.apy === "—" ? "#52525b" : "#22c55e",
                      }}
                    >
                      {pos.apy === "—" ? "—" : `${pos.apy}%`}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7" }}>
                      ${pos.value.toLocaleString()}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        color: pos.positive ? "#22c55e" : "#f87171",
                      }}
                    >
                      {pos.change}
                    </span>
                    <Sparkline data={pos.spark} positive={pos.positive} />
                    <RiskDots level={pos.risk} />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* AI insight */}
            <motion.div
              className="mt-4 px-4 py-3 rounded-xl flex items-start gap-3"
              style={{
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.15)",
              }}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.8 }}
            >
              <div
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1L5 6M5 8L5 9" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>Wisp · </span>
                <span style={{ fontSize: 11, color: "#71717a", lineHeight: 1.6 }}>
                  Your Drift SOL Perp position is{" "}
                  <span style={{ color: "#f87171", fontWeight: 600 }}>68% toward liquidation</span>.
                  Consider adding margin or reducing size.
                </span>
              </div>
              <motion.button
                className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-lg"
                style={{
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.22)",
                  color: "#a78bfa",
                  whiteSpace: "nowrap",
                }}
                whileHover={{ background: "rgba(139,92,246,0.2)" }}
                whileTap={{ scale: 0.97 }}
              >
                Simulate fix →
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
