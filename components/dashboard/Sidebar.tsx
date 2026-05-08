"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hexagon,
  Activity,
  Store,
  Navigation,
  RefreshCw,
  TrendingUp,
  ChevronLeft,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import WispMascot from "@/components/WispMascot";

const nav: {
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  tourId: string;
  exact?: boolean;
  accent: string;
  accentBg: string;
  accentBorder: string;
  glow: string;
}[] = [
  {
    label: "Dashboard",
    hint: "Portfolio overview",
    href: "/home",
    icon: Hexagon,
    tourId: "dashboard",
    exact: true,
    accent: "#a78bfa",
    accentBg: "rgba(139,92,246,0.13)",
    accentBorder: "rgba(139,92,246,0.28)",
    glow: "rgba(139,92,246,0.45)",
  },
  {
    label: "Chat",
    hint: "Ask Wisp anything",
    href: "/home/chat",
    icon: Navigation,
    tourId: "chat",
    accent: "#38bdf8",
    accentBg: "rgba(56,189,248,0.10)",
    accentBorder: "rgba(56,189,248,0.26)",
    glow: "rgba(56,189,248,0.38)",
  },
  {
    label: "Backtest",
    hint: "Strategy testing",
    href: "/home/backtest",
    icon: Activity,
    tourId: "backtest",
    accent: "#818cf8",
    accentBg: "rgba(129,140,248,0.12)",
    accentBorder: "rgba(129,140,248,0.26)",
    glow: "rgba(129,140,248,0.4)",
  },
  {
    label: "Marketplace",
    hint: "Browse strategies",
    href: "/home/marketplace",
    icon: Store,
    tourId: "marketplace",
    accent: "#fbbf24",
    accentBg: "rgba(251,191,36,0.10)",
    accentBorder: "rgba(251,191,36,0.26)",
    glow: "rgba(251,191,36,0.38)",
  },
  {
    label: "Prediction Market",
    hint: "Paper event markets",
    href: "/home/prediction-market",
    icon: TrendingUp,
    tourId: "prediction-market",
    accent: "#fb7185",
    accentBg: "rgba(251,113,133,0.10)",
    accentBorder: "rgba(251,113,133,0.26)",
    glow: "rgba(251,113,133,0.38)",
  },
  {
    label: "Trade",
    hint: "Paper & live trading",
    href: "/home/trade",
    icon: RefreshCw,
    tourId: "trade",
    accent: "#34d399",
    accentBg: "rgba(52,211,153,0.10)",
    accentBorder: "rgba(52,211,153,0.26)",
    glow: "rgba(52,211,153,0.38)",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-40"
      style={{
        width: 252,
        background: "linear-gradient(180deg, #0c0f22 0%, #080a16 100%)",
        borderRight: "1px solid rgba(255,255,255,0.055)",
      }}
    >
      {/* Right-edge glow */}
      <div
        className="absolute inset-y-0 right-0 w-px pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.2) 35%, rgba(139,92,246,0.08) 65%, transparent 100%)",
        }}
      />

      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-5 h-[70px] flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <motion.div
          whileHover={{ scale: 1.08 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className="flex-shrink-0"
        >
          <WispMascot size={32} mood="idle" />
        </motion.div>

        <div className="flex flex-col min-w-0">
          <span
            className="font-extrabold tracking-tight leading-none"
            style={{
              fontSize: 17,
              background: "linear-gradient(120deg, #ffffff 0%, #b4a8f0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Wisp
          </span>
          <span style={{ fontSize: 9.5, color: "#3f3f46", marginTop: 2, letterSpacing: "0.03em" }}>
            Solana DeFi co-pilot
          </span>
        </div>

        <motion.div
          className="ml-auto flex-shrink-0 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase"
          style={{
            background: "rgba(139,92,246,0.14)",
            color: "#a78bfa",
            border: "1px solid rgba(139,92,246,0.28)",
          }}
          animate={{ opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 2.8, repeat: Infinity }}
        >
          Beta
        </motion.div>
      </div>

      {/* ── Section label ── */}
      <div className="px-5 pt-6 pb-3">
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "#27272a",
            textTransform: "uppercase",
          }}
        >
          Workspace
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-2">
        {nav.map(({ label, hint, href, icon: Icon, tourId, exact, accent, accentBg, accentBorder, glow }) => {
          const active = isActive(href, exact);

          return (
            <Link key={href} href={href} style={{ display: "block" }}>
              <motion.div
                data-tour-id={`sidebar-${tourId}`}
                className="relative flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer"
                style={{
                  background: active ? accentBg : "rgba(0,0,0,0)",
                  border: "1px solid rgba(255,255,255,0)",
                }}
                whileHover={{
                  background: active ? accentBg : "rgba(255,255,255,0.04)",
                }}
                transition={{ duration: 0.13 }}
              >
                {/* Left accent bar */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                      style={{
                        background: `linear-gradient(180deg, ${accent}, ${accent}88)`,
                        boxShadow: `0 0 12px ${glow}`,
                      }}
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      exit={{ scaleY: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 26 }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon — no box, just the icon */}
                <Icon
                  size={16}
                  strokeWidth={active ? 2 : 1.6}
                  style={{ color: active ? accent : "#3f3f46", flexShrink: 0 }}
                />

                {/* Label */}
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: active ? 600 : 400,
                    color: active ? accent : "#52525b",
                    transition: "color 0.13s",
                  }}
                >
                  {label}
                </span>

                {/* Active dot */}
                {active && (
                  <motion.div
                    className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: accent, boxShadow: `0 0 8px ${glow}` }}
                    layoutId="nav-dot"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* ── Divider ── */}
      <div className="mx-4 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

      {/* ── Network status ── */}
      <div className="px-5 py-3.5 flex items-center gap-2">
        <motion.div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e88" }}
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <Wifi size={11} color="#3f3f46" />
        <span style={{ fontSize: 11, color: "#3f3f46" }}>Solana Mainnet</span>
        <span className="ml-auto font-mono" style={{ fontSize: 10, color: "#27272a" }}>
          &lt;100ms
        </span>
      </div>

      {/* ── Back to landing ── */}
      <div className="px-3 pb-5">
        <Link href="/">
          <motion.div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl cursor-pointer"
            style={{ color: "#3f3f46", background: "rgba(0,0,0,0)" }}
            whileHover={{ color: "#71717a", background: "rgba(255,255,255,0.03)" }}
            transition={{ duration: 0.13 }}
          >
            <ChevronLeft size={13} strokeWidth={2.5} />
            <span style={{ fontSize: 12 }}>Back to landing</span>
          </motion.div>
        </Link>
      </div>
    </aside>
  );
}
