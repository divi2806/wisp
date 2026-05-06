"use client";

import { motion } from "framer-motion";
import { Store, Sparkles } from "lucide-react";
import WispMascot from "@/components/WispMascot";

export default function MarketplacePage() {
  return (
    <div className="px-8 py-10 max-w-5xl mx-auto">
      <motion.div
        className="flex items-center gap-3 mb-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Store size={18} color="#fbbf24" strokeWidth={1.6} />
        <div>
          <h1 className="font-extrabold tracking-tight" style={{ fontSize: 24, color: "#fafafa" }}>
            Marketplace
          </h1>
          <p style={{ fontSize: 13, color: "#52525b", marginTop: 2 }}>
            Browse and deploy proven DeFi strategies.
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
        <WispMascot size={80} mood="rich" quote="copy the best 😎" />
        <h2 className="font-extrabold mt-6 mb-2" style={{ fontSize: 20, color: "#e4e4e7" }}>
          Marketplace coming soon
        </h2>
        <p style={{ fontSize: 14, color: "#52525b", maxWidth: 340, lineHeight: 1.7 }}>
          Top Solana traders will publish their battle-tested strategies here. Browse by protocol, filter by risk level, and deploy in one click.
        </p>
        <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)", color: "#fbbf24" }}
        >
          <Sparkles size={12} strokeWidth={1.6} />
          Post-launch feature
        </div>
      </motion.div>
    </div>
  );
}
