"use client";

import { motion } from "framer-motion";
import WispMascot from "@/components/WispMascot";

export default function WispPageBar() {
  return (
    <div
      className="flex items-center gap-3 px-5 flex-shrink-0"
      style={{ height: 58, borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div style={{ width: 30, height: 38, flexShrink: 0, position: "relative" }}>
        <WispMascot size={30} mood="idle" />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold" style={{ fontSize: 14, color: "#e4e4e7" }}>Wisp</span>
        <span style={{ fontSize: 11, color: "#3f3f46" }}>·</span>
        <span style={{ fontSize: 11, color: "#52525b" }}>DeFi Intelligence</span>
      </div>
      <div
        className="flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-full"
        style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.14)" }}
      >
        <motion.div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#22c55e" }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>Online</span>
      </div>
    </div>
  );
}
