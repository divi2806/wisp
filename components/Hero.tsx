"use client";

import { motion } from "framer-motion";
import WispMascot, { WispMood } from "./WispMascot";
import { Button } from "./ui/Button";
import { useState } from "react";

export default function Hero() {
  const [wispMood, setWispMood] = useState<WispMood>("idle");
  const [wispQuote, setWispQuote] = useState<string | undefined>();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden grid-bg">
      {/* Aurora glow — single lavender tone */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-10%", left: "50%", transform: "translateX(-50%)",
          width: 900, height: 600, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(91,33,182,0.18) 0%, rgba(91,33,182,0.06) 45%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 pt-28 pb-16 max-w-4xl mx-auto w-full">

        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-10 px-3.5 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: "rgba(91,33,182,0.1)",
            border: "1px solid rgba(139,92,246,0.2)",
            color: "#b4a8f0",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }}
          />
          <motion.span animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }}>
            Launching Soon
          </motion.span>
          <span style={{ color: "#3f3f46" }}>·</span>
          <span>Beta Access</span>
        </motion.div>

        {/* Wisp mascot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, type: "spring", stiffness: 120, damping: 16 }}
          className="flex justify-center mb-8"
          onMouseEnter={() => { setWispMood("happy"); setWispQuote("gm fren 👋"); }}
          onMouseLeave={() => { setWispMood("idle"); setWispQuote(undefined); }}
        >
          <WispMascot size={164} mood={wispMood} interactive quote={wispQuote} />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-extrabold leading-[1.08] mb-5"
          style={{
            fontSize: "clamp(40px, 7vw, 84px)",
            letterSpacing: "-0.03em",
            color: "#ffffff",
          }}
        >
          Your{" "}
          <span style={{ color: "#b4a8f0" }}>AI</span>{" "}
          co-pilot
          <br />
          <span style={{ color: "#3f3f46" }}>for </span>
          <span className="gradient-text">Solana DeFi</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            fontSize: "clamp(15px, 1.8vw, 18px)",
            color: "#71717a",
            lineHeight: 1.7,
            maxWidth: 520,
            margin: "0 auto 2.5rem",
          }}
        >
          Track every position across{" "}
          <span style={{ color: "#a1a1aa" }}>Kamino, Jupiter</span> and beyond.
          AI insights, backtesting, paper trading —
          all without risking a lamport.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.55 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14"
        >
          <Button
            variant="primary"
            className="px-8 py-3.5 rounded-xl text-sm"
            style={{ boxShadow: "0 0 0 1px rgba(139,92,246,0.3), 0 4px 24px rgba(91,33,182,0.25)" }}
            onMouseEnter={() => { setWispMood("excited"); setWispQuote("let's go! 🚀"); }}
            onMouseLeave={() => { setWispMood("idle"); setWispQuote(undefined); }}
          >
            Connect Wallet{" "}
            <motion.span
              className="inline-block"
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.span>
          </Button>

          <Button
            variant="secondary"
            className="px-8 py-3.5 rounded-xl text-sm"
            onMouseEnter={() => { setWispMood("thinking"); setWispQuote("show me 🎬"); }}
            onMouseLeave={() => { setWispMood("idle"); setWispQuote(undefined); }}
          >
            Watch demo
          </Button>
        </motion.div>

        {/* Protocol strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <span style={{ fontSize: 11, color: "#3f3f46" }}>Tracks across</span>
          {["Kamino", "Jupiter", "Drift", "Orca", "Raydium", "Marinade"].map((p, i) => (
            <motion.span
              key={p}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: "rgba(91,33,182,0.07)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#52525b",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 + i * 0.06 }}
              whileHover={{ color: "#b4a8f0", borderColor: "rgba(139,92,246,0.25)" }}
            >
              {p}
            </motion.span>
          ))}
          <motion.span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              background: "rgba(91,33,182,0.12)",
              border: "1px solid rgba(139,92,246,0.22)",
              color: "#8b5cf6",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
          >
            +12 more
          </motion.span>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        animate={{ opacity: [0.2, 0.6, 0.2], y: [0, 5, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        <span style={{ fontSize: 10, color: "#3f3f46", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          scroll
        </span>
        <div className="w-px h-8" style={{ background: "linear-gradient(to bottom, rgba(139,92,246,0.4), transparent)" }} />
      </motion.div>
    </section>
  );
}
