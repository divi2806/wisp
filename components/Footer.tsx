"use client";

import { motion } from "framer-motion";
import WispMascot from "./WispMascot";

export default function Footer() {
  return (
    <footer
      className="relative py-12 px-6"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <WispMascot size={36} mood="idle" />
          <div>
            <div
              className="font-bold text-base"
              style={{ color: "#a78bfa" }}
            >
              Wisp
            </div>
            <div style={{ fontSize: 11, color: "#3f3f46" }}>Your Solana DeFi co-pilot</div>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          {["Twitter", "Discord", "Docs", "Privacy"].map((l) => (
            <motion.a
              key={l}
              href="#"
              style={{ fontSize: 12, color: "#3f3f46" }}
              whileHover={{ color: "#a1a1aa", y: -1 }}
              transition={{ duration: 0.15 }}
            >
              {l}
            </motion.a>
          ))}
        </div>

        <div style={{ fontSize: 11, color: "#27272a" }}>
          © 2026 Wisp. Built on Solana.
        </div>
      </div>
    </footer>
  );
}
