"use client";

import { motion } from "framer-motion";
import { Activity, Store, Navigation, RefreshCw, TrendingUp, AlertTriangle, Wallet } from "lucide-react";
import Link from "next/link";
import WispMascot from "@/components/WispMascot";
import WispPageBar from "@/components/WispPageBar";

const quickActions = [
  {
    href: "/home/backtest",
    icon: Activity,
    label: "Backtest a Strategy",
    desc: "Run on 2 years of real DeFi data",
    accent: "#a78bfa",
  },
  {
    href: "/home/marketplace",
    icon: Store,
    label: "Browse Marketplace",
    desc: "Copy top-performing strategies",
    accent: "#fbbf24",
  },
  {
    href: "/home/chat",
    icon: Navigation,
    label: "Chat with Wisp",
    desc: "Ask anything about your portfolio",
    accent: "#38bdf8",
  },
  {
    href: "/home/trade",
    icon: RefreshCw,
    label: "Paper Trade",
    desc: "Simulate with zero risk",
    accent: "#34d399",
  },
];

const mockStats = [
  { label: "Portfolio Value", value: "$21,220", sub: "+$892 today",  subColor: "#22c55e",  icon: Wallet },
  { label: "Avg APY",         value: "14.6%",   sub: "Blended rate", subColor: "#a1a1aa",  icon: TrendingUp },
  { label: "Risk Score",      value: "6.2/10",  sub: "Moderate risk",subColor: "#f59e0b",  icon: AlertTriangle },
];

export default function HomePage() {
  return (
    <div className="flex flex-col h-screen">
      <WispPageBar />
      <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-10 max-w-5xl mx-auto">

      {/* Header */}
      <motion.div
        className="flex items-center gap-4 mb-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <WispMascot size={52} mood="happy" />
        <div>
          <h1 className="font-extrabold tracking-tight" style={{ fontSize: 26, color: "#fafafa" }}>
            gm, welcome back
          </h1>
          <p style={{ fontSize: 13, color: "#52525b", marginTop: 2 }}>
            Your Solana DeFi portfolio is ready — connect your wallet to get started.
          </p>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
      >
        {mockStats.map(({ label, value, sub, subColor, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl p-5"
            style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                {label}
              </span>
              <Icon size={14} color="#3f3f46" strokeWidth={1.6} />
            </div>
            <p className="font-extrabold tracking-tight" style={{ fontSize: 28, color: "#fafafa" }}>
              {value}
            </p>
            <p style={{ fontSize: 12, color: subColor, marginTop: 4 }}>{sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
      >
        <p className="mb-4" style={{ fontSize: 10, fontWeight: 700, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.18em" }}>
          Quick actions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map(({ href, icon: Icon, label, desc, accent }, i) => (
            <Link key={href} href={href}>
              <motion.div
                className="rounded-2xl px-5 py-4 flex items-center gap-4 cursor-pointer"
                style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.06)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                whileHover={{ background: "#0f1226", borderColor: "rgba(255,255,255,0.1)", y: -1 }}
              >
                <Icon size={16} strokeWidth={1.6} style={{ color: "#52525b", flexShrink: 0 }} />
                <div className="min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7" }}>{label}</p>
                  <p style={{ fontSize: 11, color: "#3f3f46", marginTop: 1 }}>{desc}</p>
                </div>
                <span className="ml-auto flex-shrink-0" style={{ fontSize: 14, color: "#3f3f46" }}>→</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
      </div>
    </div>
  );
}
