"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import WispMascot, { WispMood } from "./WispMascot";

const steps = [
  {
    num: "01",
    title: "Connect your wallet",
    desc: "Read-only. Wisp never asks for signing permissions. Just link and go.",
    mood: "happy" as WispMood,
    quote: "don't worry, i'm read-only 🫡",
  },
  {
    num: "02",
    title: "Wisp maps everything",
    desc: "Your positions, APYs, liquidation thresholds, funding rates — all parsed instantly via Helius.",
    mood: "thinking" as WispMood,
    quote: "processing ur bags... 🧠",
  },
  {
    num: "03",
    title: "Get actionable intel",
    desc: "Specific, DeFi-native suggestions — not generic ChatGPT slop. Wisp knows the protocols.",
    mood: "mischief" as WispMood,
    quote: "not financial advice tho 😇",
  },
  {
    num: "04",
    title: "Test before you ape",
    desc: "Backtest on historical data or paper trade live. Mess up fake money first, then go real.",
    mood: "dead" as WispMood,
    quote: "rekt? only in simulation 💀",
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="how-it-works" className="relative py-28 px-6 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(124,58,237,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8b5cf6" }} className="block mb-4">
            How it works
          </span>
          <h2
            className="font-extrabold tracking-[-0.025em] leading-[1.05]"
            style={{ fontSize: "clamp(28px, 4.5vw, 52px)", color: "#fafafa" }}
          >
            Wallet to alpha{" "}
            <span style={{ background: "linear-gradient(120deg,#ffffff,#b4a8f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>in 60 seconds</span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div ref={ref} className="relative">
          {/* Vertical connecting line */}
          <motion.div
            className="absolute left-5 top-0 bottom-0 w-px hidden md:block"
            style={{ background: "linear-gradient(to bottom, rgba(139,92,246,0.6), rgba(91,33,182,0.15), transparent)" }}
            initial={{ scaleY: 0, transformOrigin: "top" }}
            animate={isInView ? { scaleY: 1 } : {}}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          <div className="space-y-0">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className="relative flex items-start gap-8 md:gap-12 py-10"
                initial={{ opacity: 0, x: -30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.14, ease: [0.25,0.1,0.25,1] }}
              >
                {/* Timeline dot */}
                <div className="relative flex-shrink-0 hidden md:flex flex-col items-center" style={{ width: 40 }}>
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full mt-1.5"
                    style={{ background: "#a78bfa", boxShadow: "0 0 12px #7c3aed" }}
                    animate={{ boxShadow: ["0 0 8px #7c3aed88", "0 0 20px #7c3aed", "0 0 8px #7c3aed88"] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#52525b" }}>{step.num}</span>
                    </div>
                    <h3
                      className="font-semibold text-[#e4e4e7] mb-2"
                      style={{ fontSize: "clamp(18px, 2.5vw, 26px)" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-[#71717a] text-sm leading-relaxed max-w-sm">{step.desc}</p>
                  </div>

                  {/* Wisp on right */}
                  <div className="flex-shrink-0">
                    <WispMascot size={72} mood={step.mood} quote={step.quote} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
