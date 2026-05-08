"use client";

import { motion } from "framer-motion";
import { Activity, FlaskConical } from "lucide-react";
import WispMascot from "@/components/WispMascot";
import WispPageBar from "@/components/WispPageBar";

export default function BacktestPage() {
  return (
    <div className="flex flex-col h-screen">
      <WispPageBar />
      <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-10 max-w-5xl mx-auto">
      <motion.div
        className="flex items-center gap-3 mb-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Activity size={18} color="#818cf8" strokeWidth={1.6} />
        <div>
          <h1 className="font-extrabold tracking-tight" style={{ fontSize: 24, color: "#fafafa" }}>
            Backtest
          </h1>
          <p style={{ fontSize: 13, color: "#52525b", marginTop: 2 }}>
            Run strategies against 2 years of real Solana DeFi data.
          </p>
        </div>
      </motion.div>

      <motion.div
        className="rounded-2xl flex flex-col items-center justify-center py-24 text-center"
        style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.06)" }}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <WispMascot size={80} mood="thinking" quote="crunching data 📊" />
        <h2 className="font-extrabold mt-6 mb-2" style={{ fontSize: 20, color: "#e4e4e7" }}>
          Backtesting coming soon
        </h2>
        <p style={{ fontSize: 14, color: "#52525b", maxWidth: 340, lineHeight: 1.7 }}>
          The backtesting engine is in active development. You&apos;ll be able to test any strategy against historical DeFi data with full P&amp;L and risk analytics.
        </p>
        <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
          style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.18)", color: "#818cf8" }}
        >
          <FlaskConical size={12} strokeWidth={1.6} />
          Milestone 4 · June 2026
        </div>
      </motion.div>
    </div>
      </div>
    </div>
  );
}
