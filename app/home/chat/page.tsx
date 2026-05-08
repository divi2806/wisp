"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Paperclip, ArrowUp, X, Copy, Check, FileText,
  Mic, MicOff, Square, ThumbsUp, ThumbsDown, RotateCcw,
  ChevronDown, Trash2,
} from "lucide-react";
import WispMascot, { WispMood } from "@/components/WispMascot";

/* ─────────────────── Types ─────────────────── */
type Reaction = "up" | "down" | null;
type AttachedFile = { id: string; name: string; size: string };
type DashboardVisual =
  | {
      kind: "yield-ranking";
      title: string;
      source: "DefiLlama";
      fetchedAt: string;
      buckets: Array<{
        label: string;
        tone: "green" | "cyan" | "amber";
        pools: Array<{
          protocol: string;
          symbol: string;
          apy: number;
          tvlUsd: number;
          riskTier: "lower" | "balanced" | "high";
          reason: string;
        }>;
      }>;
    }
  | {
      kind: "token-snapshot";
      title: string;
      source: "Birdeye";
      tokens: Array<{
        symbol: string;
        name: string;
        priceUsd: number | null;
        priceChange24hPct: number | null;
        volume24hUsd: number | null;
        liquidityUsd: number | null;
        marketCapUsd: number | null;
      }>;
    }
  | {
      kind: "wallet-holdings";
      title: string;
      source: "Helius/Birdeye";
      address: string;
      label: string;
      totalValueUsd: number | null;
      nativeSol: { amount: number | null; valueUsd: number | null };
      tokenCount: number;
      tokens: Array<{ symbol: string; name: string; amount: number | null; valueUsd: number | null; priceUsd: number | null }>;
      protocolExposure: Array<{ protocol: string; reason: string; confidence: "low" | "medium" | "high" }>;
    }
  | {
      kind: "token-risk";
      title: string;
      source: "Birdeye";
      symbol: string;
      name: string;
      mint: string;
      score: number;
      label: "lower" | "medium" | "high" | "unknown";
      overview: {
        priceUsd: number | null;
        priceChange24hPct: number | null;
        volume24hUsd: number | null;
        liquidityUsd: number | null;
        marketCapUsd: number | null;
        fdvUsd: number | null;
        holders: number | null;
      };
      checks: Array<{ label: string; status: "ok" | "warn" | "danger" | "unknown"; detail: string }>;
      warnings: string[];
    }
  | {
      kind: "perps-snapshot";
      title: string;
      source: "Drift/Jupiter/Flash";
      venue: string;
      market: string | null;
      snapshots: Array<{
        venue: "drift" | "jupiter" | "flash";
        market: string;
        priceUsd: number | null;
        fundingRate: number | null;
        openInterestUsd: number | null;
        volume24hUsd: number | null;
        longShortSkew: number | null;
      }>;
      warnings: string[];
    }
  | {
      kind: "protocol-positions";
      title: string;
      source: "Protocol decoders";
      protocols: Array<{
        protocol: string;
        status: "live" | "partial-live" | "market-live" | "needs-decoder" | "not-configured";
        provider: string;
        apiKeyRequired: boolean;
        walletRequirement: "none" | "public-address" | "connected-wallet";
        detail: string;
        needs: string[];
        positions?: Array<{
          label: string;
          positionType: "lend" | "perp" | "spot" | "clmm" | "amm" | "vault" | "unknown";
          suppliedUsd: number | null;
          borrowedUsd: number | null;
          netUsd: number | null;
          health: "no-borrow" | "lower-risk" | "watch" | "danger" | "unknown";
          deposits: Array<{ symbol: string; valueUsd: number | null; apy: number | null; amount?: number | null }>;
          borrows: Array<{ symbol: string; valueUsd: number | null; apy: number | null; amount?: number | null }>;
          metrics: Array<{ label: string; value: string; tone?: "neutral" | "good" | "warn" | "danger" }>;
        }>;
      }>;
      warnings: string[];
    };
type Message = {
  id: string;
  role: "user" | "wisp";
  content: string;
  visuals?: DashboardVisual[];
  files?: AttachedFile[];
  timestamp: Date;
  reaction?: Reaction;
  streaming?: boolean;
};

/* ─────────────────── Data ─────────────────── */
const SUGGESTIONS = [
  { label: "Best yields",      prompt: "Show the best Solana yield options by risk bucket right now." },
  { label: "Wallet lookup",    prompt: "What does toly.sol hold? Show public wallet holdings and risks." },
  { label: "Token risk",       prompt: "Analyze JUP: is it a clean setup or risky to buy?" },
  { label: "Perps",            prompt: "Show SOL perps funding, open interest, and risk context." },
  { label: "Protocol positions", prompt: "What protocol position APIs do we support for Kamino, Drift, MarginFi, Meteora, Orca and Raydium?" },
];

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function toApiHistory(messages: Message[]) {
  return messages
    .slice(-12)
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
}

async function requestWispReply(args: {
  message: string;
  history: Message[];
  files?: AttachedFile[];
  connectedWalletAddress?: string | null;
}) {
  const res = await fetch("/api/ai/wisp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      surface: "dashboard",
      message: args.message,
      history: toApiHistory(args.history),
      files: args.files ?? [],
      connectedWalletAddress: args.connectedWalletAddress ?? null,
    }),
  });

  const json = (await res.json()) as { reply?: string; visuals?: DashboardVisual[]; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Wisp is offline.");
  return {
    reply: (json.reply ?? "").trim() || "I blanked for a second. Ask me again?",
    visuals: json.visuals ?? [],
  };
}

/* ─────────────────── Prose renderer ─────────────────── */
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+?\*\*|`[^`]+?`)/g).map((chunk, ci) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return (
        <strong key={ci} style={{ color: "#e4e4e7", fontWeight: 700 }}>
          {chunk.slice(2, -2)}
        </strong>
      );
    }

    if (chunk.startsWith("`") && chunk.endsWith("`")) {
      return (
        <code
          key={ci}
          className="font-mono rounded-md px-1 py-0.5"
          style={{ background: "rgba(255,255,255,0.06)", color: "#c4b5fd", fontSize: "0.92em" }}
        >
          {chunk.slice(1, -1)}
        </code>
      );
    }

    return <span key={ci}>{chunk.replace(/\*\*/g, "").replace(/`/g, "")}</span>;
  });
}

function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((line, li) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={li} className="h-1" />;

        const heading = /^#{1,6}\s+(.+)$/.exec(trimmed);
        if (heading) {
          return (
            <p key={li} className="font-semibold" style={{ color: "#e4e4e7" }}>
              {renderInline(heading[1])}
            </p>
          );
        }

        const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
        if (bullet) {
          return (
            <div key={li} className="flex gap-2">
              <span style={{ color: "#71717a" }}>•</span>
              <span>{renderInline(bullet[1])}</span>
            </div>
          );
        }

        const numbered = /^(\d+)[.)]\s+(.+)$/.exec(trimmed);
        if (numbered) {
          return (
            <div key={li} className="flex gap-2">
              <span className="font-mono" style={{ color: "#71717a" }}>
                {numbered[1]}.
              </span>
              <span>{renderInline(numbered[2])}</span>
            </div>
          );
        }

        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
          return (
            <div key={li} className="font-mono overflow-x-auto whitespace-pre" style={{ color: "#a1a1aa", fontSize: 12 }}>
              {trimmed}
            </div>
          );
        }

        return <p key={li}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

function fmtUsd(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "--";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(value < 1 ? 4 : 2)}`;
}

function fmtPct(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function fmtCount(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "--";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

function toneColor(tone: "green" | "cyan" | "amber") {
  if (tone === "green") return "#22c55e";
  if (tone === "cyan") return "#38bdf8";
  return "#f59e0b";
}

function DashboardVisuals({ visuals }: { visuals?: DashboardVisual[] }) {
  if (!visuals?.length) return null;

  return (
    <div className="mt-4 space-y-3">
      {visuals.map((visual, idx) => {
        if (visual.kind === "yield-ranking") return <YieldRankingVisual key={`${visual.kind}-${idx}`} visual={visual} />;
        if (visual.kind === "token-snapshot") return <TokenSnapshotVisual key={`${visual.kind}-${idx}`} visual={visual} />;
        if (visual.kind === "wallet-holdings") return <WalletHoldingsVisual key={`${visual.kind}-${idx}`} visual={visual} />;
        if (visual.kind === "token-risk") return <TokenRiskVisual key={`${visual.kind}-${idx}`} visual={visual} />;
        if (visual.kind === "perps-snapshot") return <PerpsVisual key={`${visual.kind}-${idx}`} visual={visual} />;
        return <ProtocolPositionsVisual key={`${visual.kind}-${idx}`} visual={visual} />;
      })}
    </div>
  );
}

function YieldRankingVisual({ visual }: { visual: Extract<DashboardVisual, { kind: "yield-ranking" }> }) {
  const maxApy = Math.max(
    1,
    ...visual.buckets.flatMap((bucket) => bucket.pools.map((pool) => pool.apy))
  );

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <p className="font-semibold" style={{ color: "#e4e4e7", fontSize: 12 }}>{visual.title}</p>
          <p className="font-mono" style={{ color: "#52525b", fontSize: 10 }}>
            {visual.source} yield pools
          </p>
        </div>
        <span className="font-mono" style={{ color: "#71717a", fontSize: 10 }}>
          {new Date(visual.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="p-3 space-y-3">
        {visual.buckets.map((bucket) => {
          const color = toneColor(bucket.tone);
          return (
            <div key={bucket.label}>
              <div className="mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="font-semibold" style={{ color: "#a1a1aa", fontSize: 11 }}>{bucket.label}</span>
              </div>
              <div className="space-y-2">
                {bucket.pools.map((pool) => {
                  const width = `${Math.max(8, Math.min(100, (pool.apy / maxApy) * 100))}%`;
                  return (
                    <div
                      key={`${bucket.label}-${pool.protocol}-${pool.symbol}`}
                      className="rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold" style={{ color: "#e4e4e7", fontSize: 12 }}>
                            {pool.protocol} <span style={{ color: "#71717a" }}>-</span> {pool.symbol}
                          </p>
                          <p className="truncate" style={{ color: "#52525b", fontSize: 10 }}>{pool.reason}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-mono" style={{ color, fontSize: 13, fontWeight: 700 }}>{pool.apy.toFixed(2)}%</p>
                          <p className="font-mono" style={{ color: "#71717a", fontSize: 10 }}>{fmtUsd(pool.tvlUsd)} TVL</p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TokenSnapshotVisual({ visual }: { visual: Extract<DashboardVisual, { kind: "token-snapshot" }> }) {
  return (
    <div
      className="rounded-2xl p-3"
      style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold" style={{ color: "#e4e4e7", fontSize: 12 }}>{visual.title}</p>
        <span className="font-mono" style={{ color: "#52525b", fontSize: 10 }}>{visual.source}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visual.tokens.map((token) => {
          const changeColor = (token.priceChange24hPct ?? 0) >= 0 ? "#22c55e" : "#f87171";
          return (
            <div
              key={token.symbol}
              className="rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: "#e4e4e7", fontSize: 12 }}>{token.symbol}</p>
                  <p className="truncate" style={{ color: "#52525b", fontSize: 10 }}>{token.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono" style={{ color: "#a78bfa", fontSize: 12 }}>{fmtUsd(token.priceUsd)}</p>
                  <p className="font-mono" style={{ color: changeColor, fontSize: 10 }}>{fmtPct(token.priceChange24hPct)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 font-mono" style={{ fontSize: 10 }}>
                <span style={{ color: "#71717a" }}>Vol {fmtUsd(token.volume24hUsd)}</span>
                <span style={{ color: "#71717a" }}>Liq {fmtUsd(token.liquidityUsd)}</span>
                <span style={{ color: "#71717a" }}>MC {fmtUsd(token.marketCapUsd)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WalletHoldingsVisual({ visual }: { visual: Extract<DashboardVisual, { kind: "wallet-holdings" }> }) {
  const maxValue = Math.max(1, ...visual.tokens.map((token) => token.valueUsd ?? 0), visual.nativeSol.valueUsd ?? 0);

  return (
    <div className="rounded-2xl p-3" style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold" style={{ color: "#e4e4e7", fontSize: 12 }}>{visual.title}</p>
          <p className="font-mono truncate" style={{ color: "#52525b", fontSize: 10 }}>{visual.label} - {visual.address}</p>
        </div>
        <div className="text-right">
          <p className="font-mono" style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>{fmtUsd(visual.totalValueUsd)}</p>
          <p className="font-mono" style={{ color: "#71717a", fontSize: 10 }}>{visual.tokenCount} tokens</p>
        </div>
      </div>

      <div className="space-y-2">
        <HoldingRow
          label="SOL"
          subtitle={`${(visual.nativeSol.amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`}
          value={visual.nativeSol.valueUsd}
          maxValue={maxValue}
          color="#a78bfa"
        />
        {visual.tokens.slice(0, 7).map((token) => (
          <HoldingRow
            key={`${token.symbol}-${token.name}`}
            label={token.symbol}
            subtitle={`${token.name} ${token.amount === null ? "" : token.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
            value={token.valueUsd}
            maxValue={maxValue}
            color="#38bdf8"
          />
        ))}
      </div>

      {visual.protocolExposure.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visual.protocolExposure.map((item) => (
            <span key={item.protocol} className="rounded-full px-2 py-1" style={{ background: "rgba(167,139,250,0.1)", color: "#c4b5fd", fontSize: 10 }}>
              {item.protocol}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function HoldingRow(props: { label: string; subtitle: string; value: number | null; maxValue: number; color: string }) {
  const width = `${Math.max(5, Math.min(100, ((props.value ?? 0) / props.maxValue) * 100))}%`;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold" style={{ color: "#e4e4e7", fontSize: 11 }}>{props.label}</p>
          <p className="truncate" style={{ color: "#52525b", fontSize: 10 }}>{props.subtitle}</p>
        </div>
        <span className="font-mono" style={{ color: "#a1a1aa", fontSize: 11 }}>{fmtUsd(props.value)}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width, background: props.color }} />
      </div>
    </div>
  );
}

function riskColor(status: "ok" | "warn" | "danger" | "unknown") {
  if (status === "ok") return "#22c55e";
  if (status === "warn") return "#f59e0b";
  if (status === "danger") return "#f87171";
  return "#71717a";
}

function TokenRiskVisual({ visual }: { visual: Extract<DashboardVisual, { kind: "token-risk" }> }) {
  const scoreColor = visual.score >= 78 ? "#22c55e" : visual.score >= 55 ? "#f59e0b" : "#f87171";

  return (
    <div className="rounded-2xl p-3" style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold" style={{ color: "#e4e4e7", fontSize: 12 }}>{visual.title}</p>
          <p className="font-mono" style={{ color: "#52525b", fontSize: 10 }}>{visual.symbol} - {visual.name}</p>
        </div>
        <div className="text-right">
          <p className="font-mono" style={{ color: scoreColor, fontSize: 18, fontWeight: 800 }}>{visual.score}</p>
          <p className="font-mono uppercase" style={{ color: "#71717a", fontSize: 10 }}>{visual.label} risk</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        <Metric label="Price" value={fmtUsd(visual.overview.priceUsd)} />
        <Metric label="24h" value={fmtPct(visual.overview.priceChange24hPct)} />
        <Metric label="Liquidity" value={fmtUsd(visual.overview.liquidityUsd)} />
        <Metric label="MCap" value={fmtUsd(visual.overview.marketCapUsd)} />
        <Metric label="FDV" value={fmtUsd(visual.overview.fdvUsd)} />
        <Metric label="Holders" value={fmtCount(visual.overview.holders)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visual.checks.map((check) => (
          <div key={check.label} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: riskColor(check.status) }} />
              <span className="font-semibold" style={{ color: "#e4e4e7", fontSize: 11 }}>{check.label}</span>
            </div>
            <p style={{ color: "#71717a", fontSize: 10, lineHeight: 1.45 }}>{check.detail}</p>
          </div>
        ))}
      </div>

      {visual.warnings.length > 0 && (
        <div className="mt-2 rounded-xl p-2.5" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)" }}>
          <p className="font-semibold" style={{ color: "#fbbf24", fontSize: 10 }}>Partial Birdeye coverage</p>
          <p className="mt-1" style={{ color: "#a1a1aa", fontSize: 10, lineHeight: 1.45 }}>
            {visual.warnings.slice(0, 2).join(" | ")}
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-2.5 py-2" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="font-mono" style={{ color: "#52525b", fontSize: 9 }}>{label}</p>
      <p className="font-mono truncate" style={{ color: "#a1a1aa", fontSize: 11 }}>{value}</p>
    </div>
  );
}

function PerpsVisual({ visual }: { visual: Extract<DashboardVisual, { kind: "perps-snapshot" }> }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-semibold" style={{ color: "#e4e4e7", fontSize: 12 }}>{visual.title}</p>
          <p className="font-mono" style={{ color: "#52525b", fontSize: 10 }}>{visual.venue} {visual.market ?? "markets"}</p>
        </div>
        <span className="font-mono" style={{ color: "#71717a", fontSize: 10 }}>{visual.source}</span>
      </div>
      {visual.snapshots.length > 0 ? (
        <div className="space-y-2">
          {visual.snapshots.map((item) => (
            <div key={`${item.venue}-${item.market}`} className="grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Metric label="Market" value={item.market} />
              <Metric label="Price" value={fmtUsd(item.priceUsd)} />
              <Metric label="Funding" value={fmtPct(item.fundingRate)} />
              <Metric label="OI" value={fmtUsd(item.openInterestUsd)} />
              <Metric label="24h Vol" value={fmtUsd(item.volume24hUsd)} />
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "#71717a", fontSize: 11 }}>Live perps snapshot not available from the configured endpoint yet.</p>
      )}
      {visual.warnings.length > 0 && (
        <p className="mt-2" style={{ color: "#f59e0b", fontSize: 10 }}>{visual.warnings[0]}</p>
      )}
    </div>
  );
}

function protocolStatusColor(status: Extract<DashboardVisual, { kind: "protocol-positions" }>["protocols"][number]["status"]) {
  if (status === "live") return "#22c55e";
  if (status === "partial-live" || status === "market-live") return "#38bdf8";
  if (status === "needs-decoder") return "#f59e0b";
  return "#71717a";
}

function healthColor(health: "no-borrow" | "lower-risk" | "watch" | "danger" | "unknown") {
  if (health === "no-borrow" || health === "lower-risk") return "#22c55e";
  if (health === "watch") return "#f59e0b";
  if (health === "danger") return "#f87171";
  return "#71717a";
}

function protocolMetricColor(tone: "neutral" | "good" | "warn" | "danger" | undefined) {
  if (tone === "good") return "#86efac";
  if (tone === "warn") return "#facc15";
  if (tone === "danger") return "#fca5a5";
  return "#d4d4d8";
}

function ProtocolPositionsVisual({ visual }: { visual: Extract<DashboardVisual, { kind: "protocol-positions" }> }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold" style={{ color: "#e4e4e7", fontSize: 12 }}>{visual.title}</p>
        <span className="font-mono" style={{ color: "#52525b", fontSize: 10 }}>{visual.source}</span>
      </div>
      <div className="space-y-2">
        {visual.protocols.map((item) => (
          <div key={`${item.protocol}-${item.status}`} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-semibold" style={{ color: "#e4e4e7", fontSize: 11 }}>{item.protocol}</span>
              <span className="font-mono" style={{ color: protocolStatusColor(item.status), fontSize: 9 }}>{item.status}</span>
            </div>
            <div className="mb-1 flex flex-wrap gap-1.5">
              <span className="rounded-full px-2 py-0.5 font-mono" style={{ background: "rgba(255,255,255,0.04)", color: "#71717a", fontSize: 9 }}>
                {item.apiKeyRequired ? "key needed" : "no extra key"}
              </span>
              <span className="rounded-full px-2 py-0.5 font-mono" style={{ background: "rgba(255,255,255,0.04)", color: "#71717a", fontSize: 9 }}>
                {item.walletRequirement}
              </span>
            </div>
            <p style={{ color: "#71717a", fontSize: 10, lineHeight: 1.45 }}>{item.detail}</p>
            <p className="mt-1 font-mono truncate" style={{ color: "#52525b", fontSize: 9 }}>{item.provider}</p>
            {item.positions && item.positions.length > 0 && (
              <div className="mt-2 space-y-2">
                {item.positions.slice(0, 3).map((position) => (
                  <div key={position.label} className="rounded-lg p-2" style={{ background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block font-mono truncate" style={{ color: "#a1a1aa", fontSize: 9 }}>{position.label}</span>
                        <span className="font-mono" style={{ color: "#52525b", fontSize: 8 }}>{position.positionType}</span>
                      </div>
                      <span className="shrink-0 font-mono" style={{ color: healthColor(position.health), fontSize: 9 }}>{position.health}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Metric label="Supplied" value={fmtUsd(position.suppliedUsd)} />
                      <Metric label="Borrowed" value={fmtUsd(position.borrowedUsd)} />
                      <Metric label="Net" value={fmtUsd(position.netUsd)} />
                    </div>
                    {position.metrics.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {position.metrics.slice(0, 8).map((metric, index) => (
                          <div key={`${metric.label}-${index}`} className="rounded-md px-2 py-1" style={{ background: "rgba(255,255,255,0.035)" }}>
                            <p className="font-mono uppercase" style={{ color: "#52525b", fontSize: 8 }}>{metric.label}</p>
                            <p className="font-mono truncate" style={{ color: protocolMetricColor(metric.tone), fontSize: 9 }}>{metric.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {(position.deposits.length > 0 || position.borrows.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {position.deposits.map((leg) => (
                          <span key={`d-${leg.symbol}-${leg.valueUsd}`} className="rounded-full px-2 py-0.5" style={{ background: "rgba(34,197,94,0.08)", color: "#86efac", fontSize: 9 }}>
                            +{leg.symbol} {fmtUsd(leg.valueUsd)}
                          </span>
                        ))}
                        {position.borrows.map((leg) => (
                          <span key={`b-${leg.symbol}-${leg.valueUsd}`} className="rounded-full px-2 py-0.5" style={{ background: "rgba(248,113,113,0.08)", color: "#fca5a5", fontSize: 9 }}>
                            -{leg.symbol} {fmtUsd(leg.valueUsd)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {item.needs.length > 0 && (
              <p className="mt-1" style={{ color: "#52525b", fontSize: 10 }}>
                Needs: {item.needs.slice(0, 2).join(" · ")}
              </p>
            )}
          </div>
        ))}
      </div>
      {visual.warnings.length > 0 && (
        <p className="mt-2" style={{ color: "#f59e0b", fontSize: 10 }}>{visual.warnings[0]}</p>
      )}
    </div>
  );
}

/* ─────────────────── Typewriter ─────────────────── */
function TypewriterText({ text, onComplete, onTick }: { text: string; onComplete: () => void; onTick?: () => void }) {
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const cbRef = useRef(onComplete);
  const tickRef = useRef(onTick);
  const frameRef = useRef<number | null>(null);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cbRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    tickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (startTimerRef.current !== null) clearTimeout(startTimerRef.current);

    if (!text.length) {
      setIdx(0);
      setDone(true);
      cbRef.current();
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setIdx(text.length);
      setDone(true);
      cbRef.current();
      return;
    }

    let visibleIndex = 0;
    let lastTime = 0;
    let carry = 0;
    let pauseUntil = 0;
    let completed = false;
    const charsPerMs = 0.052;

    const finish = () => {
      if (completed) return;
      completed = true;
      setDone(true);
      cbRef.current();
    };

    const punctuationPause = (char: string) => {
      if (char === "\n") return 120;
      if (/[.!?]/.test(char)) return 130;
      if (/[,;:]/.test(char)) return 60;
      return 0;
    };

    const step = (time: number) => {
      if (completed) return;
      if (!lastTime) lastTime = time;

      if (time < pauseUntil) {
        frameRef.current = requestAnimationFrame(step);
        return;
      }

      const elapsed = Math.min(time - lastTime, 80);
      lastTime = time;
      carry += elapsed * charsPerMs;

      let nextIndex = visibleIndex;
      while (carry >= 1 && nextIndex < text.length) {
        nextIndex += 1;
        carry -= 1;

        const pause = punctuationPause(text[nextIndex - 1]);
        if (pause > 0) {
          pauseUntil = time + pause;
          break;
        }
      }

      if (nextIndex !== visibleIndex) {
        visibleIndex = nextIndex;
        setIdx(visibleIndex);
        tickRef.current?.();
      }

      if (visibleIndex >= text.length) {
        setDone(true);
        finish();
        return;
      }

      frameRef.current = requestAnimationFrame(step);
    };

    setIdx(0);
    setDone(false);
    startTimerRef.current = setTimeout(() => {
      frameRef.current = requestAnimationFrame(step);
    }, 220);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (startTimerRef.current !== null) clearTimeout(startTimerRef.current);
    };
  }, [text]);

  return (
    <>
      <Prose text={text.slice(0, idx)} />
      {!done && (
        <motion.span
          className="inline-block w-[2px] h-[13px] rounded-full ml-[2px] align-middle"
          style={{ background: "#a78bfa" }}
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.55, repeat: Infinity }}
        />
      )}
    </>
  );
}

/* ─────────────────── Typing dots ─────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: i === 1 ? "#a78bfa" : "#7c3aed" }}
          animate={{ y: [0, -6, 0], scale: [0.82, 1.12, 0.82], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.72, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

const THINKING_STEPS = [
  "Reading your question",
  "Checking live Solana data",
  "Analyzing risk and context",
  "Preparing the answer",
];

function ThinkingBubble() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      setStep(Math.min(THINKING_STEPS.length - 1, Math.floor(elapsed / 2400)));
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: "rgba(13,16,32,0.78)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-semibold" style={{ color: "#a78bfa", fontSize: 12 }}>Wisp is thinking</span>
        <TypingDots />
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={THINKING_STEPS[step]}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mb-2"
          style={{ color: "#71717a", fontSize: 11, lineHeight: 1.45 }}
        >
          {THINKING_STEPS[step]}
        </motion.p>
      </AnimatePresence>
      <div className="h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ width: "38%", background: "linear-gradient(90deg, transparent, #a78bfa, transparent)" }}
          animate={{ x: ["-120%", "280%"] }}
          transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

/* ─────────────────── Copy button ─────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <motion.button
      onClick={copy}
      className="flex items-center gap-1 px-2 py-1 rounded-lg"
      style={{ color: "#3f3f46", fontSize: 11 }}
      whileHover={{ color: "#71717a", background: "rgba(255,255,255,0.05)" }}
    >
      {done ? <Check size={11} /> : <Copy size={11} />}
      <span>{done ? "Copied" : "Copy"}</span>
    </motion.button>
  );
}

/* ─────────────────── Voice hook ─────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any;
function useVoice(onTranscript: (t: string, final: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<AnyRec>(null);
  const cbRef  = useRef(onTranscript);

  useEffect(() => {
    cbRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    let active = true;
    queueMicrotask(() => {
      if (active) setSupported(true);
    });
    const r: AnyRec = new SR();
    r.continuous      = false;
    r.interimResults  = true;
    r.lang            = "en-US";
    r.onresult = (e: AnyRec) => {
      const transcript = Array.from(e.results as AnyRec[]).map((res: AnyRec) => res[0].transcript).join("");
      cbRef.current(transcript, e.results[e.results.length - 1].isFinal);
    };
    r.onerror = () => setListening(false);
    r.onend   = () => setListening(false);
    recRef.current = r;
    return () => {
      active = false;
      r.abort();
    };
  }, []);

  const start = useCallback(() => { recRef.current?.start(); setListening(true); }, []);
  const stop  = useCallback(() => { recRef.current?.stop();  setListening(false); }, []);
  return { listening, supported, start, stop };
}

/* ════════════════════════════════════════════════════════ */
/*                     MAIN COMPONENT                       */
/* ════════════════════════════════════════════════════════ */
export default function ChatPage() {
  const { publicKey } = useWallet();
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [files,     setFiles]     = useState<AttachedFile[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null); // message id being streamed
  const [mood,      setMood]      = useState<WispMood>("mischief");
  const [focused,   setFocused]   = useState(false);
  const [showDown,  setShowDown]  = useState(false);

  const endRef      = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const stickToBottomRef = useRef(true);

  /* voice */
  const voice = useVoice((t, final) => {
    setInput(t);
    if (final) setTimeout(() => send(t), 300);
  });

  /* scroll to bottom */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    endRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    if (stickToBottomRef.current) scrollToBottom(streaming ? "auto" : "smooth");
  }, [messages, loading, streaming, scrollToBottom]);

  /* scroll-down button visibility */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowDown(dist > 120);
      stickToBottomRef.current = dist < 160;
    };
    el.addEventListener("scroll", check);
    check();
    return () => el.removeEventListener("scroll", check);
  }, []);

  /* auto-grow textarea */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [input]);

  /* ── Send ── */
  async function send(text = input) {
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;
    if (loading) return;

    const attachedFiles = files.length ? [...files] : [];
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      files: attachedFiles.length ? attachedFiles : undefined,
      timestamp: new Date(),
    };

    const history = [...messages, userMsg];
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setFiles([]);
    setLoading(true);
    setMood("thinking");
    stickToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom("smooth"));

    try {
      const result = await requestWispReply({
        message: trimmed,
        history,
        files: attachedFiles,
        connectedWalletAddress: publicKey?.toBase58() ?? null,
      });
      const id = crypto.randomUUID();
      const wispMsg: Message = {
        id,
        role: "wisp",
        content: result.reply,
        visuals: result.visuals,
        timestamp: new Date(),
        streaming: true,
      };

      setMessages((p) => [...p, wispMsg]);
      setStreaming(id);
      setMood("happy");
    } catch (err) {
      const id = crypto.randomUUID();
      setMessages((p) => [
        ...p,
        {
          id,
          role: "wisp",
          content:
            err instanceof Error
              ? `I couldn't reach Azure OpenAI: **${err.message}**`
              : "I couldn't reach Azure OpenAI. Try again in a bit.",
          timestamp: new Date(),
          streaming: true,
        },
      ]);
      setStreaming(id);
      setMood("dead");
    } finally {
      setLoading(false);
    }
  }

  const onStreamDone = useCallback((id: string) => {
    setStreaming(null);
    setMessages((p) => p.map((m) => m.id === id ? { ...m, streaming: false } : m));
    setTimeout(() => setMood("mischief"), 2200);
  }, []);

  /* ── Regenerate last wisp message ── */
  const regenerate = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || loading || streaming) return;
    const lastWispIdx = messages.map((m, i) => (m.role === "wisp" ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
    const history = lastWispIdx >= 0 ? messages.filter((_, i) => i !== lastWispIdx) : messages;
    setMessages(history);
    setLoading(true);
    setMood("thinking");
    stickToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom("smooth"));
    try {
      const result = await requestWispReply({
        message: lastUser.content,
        history,
        files: lastUser.files ?? [],
        connectedWalletAddress: publicKey?.toBase58() ?? null,
      });
      const id = crypto.randomUUID();
      setMessages((p) => [...p, {
        id, role: "wisp", content: result.reply, visuals: result.visuals,
        timestamp: new Date(), streaming: true,
      }]);
      setStreaming(id);
      setMood("happy");
    } catch (err) {
      const id = crypto.randomUUID();
      setMessages((p) => [...p, {
        id,
        role: "wisp",
        content:
          err instanceof Error
            ? `I couldn't reach Azure OpenAI: **${err.message}**`
            : "I couldn't reach Azure OpenAI. Try again in a bit.",
        timestamp: new Date(),
        streaming: true,
      }]);
      setStreaming(id);
      setMood("dead");
    } finally {
      setLoading(false);
    }
  };

  /* ── Reaction ── */
  const react = (id: string, r: Reaction) => {
    setMessages((p) => p.map((m) => m.id === id ? { ...m, reaction: m.reaction === r ? null : r } : m));
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles((p) => [...p, ...Array.from(e.target.files ?? []).map((f) => ({
      id: crypto.randomUUID(), name: f.name, size: fmtBytes(f.size),
    }))]);
    e.target.value = "";
  };

  const clearChat = () => { setMessages([]); setStreaming(null); setLoading(false); setMood("mischief"); };
  const canSend = (input.trim().length > 0 || files.length > 0) && !loading && !streaming;
  const lastWispId = [...messages].reverse().find((m) => m.role === "wisp")?.id;
  const handleChatWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;

    const canScroll = el.scrollHeight > el.clientHeight;
    if (!canScroll) return;

    event.stopPropagation();
    stickToBottomRef.current = false;
  }, []);

  return (
    <div className="flex min-h-0 flex-col" style={{ height: "100dvh", background: "#080b14", overflow: "hidden" }}>

      {/* ══ Top bar ══ */}
      <div
        className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{ height: 58, borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div style={{ width: 30, height: 38, flexShrink: 0, position: "relative" }}>
          <WispMascot size={30} mood={mood} />
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

        {/* Clear conversation */}
        {messages.length > 0 && (
          <motion.button
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ color: "#3f3f46", fontSize: 11 }}
            whileHover={{ color: "#f87171", background: "rgba(248,113,113,0.07)" }}
            onClick={clearChat}
            title="Clear conversation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </motion.button>
        )}
        {messages.length === 0 && <span className="ml-auto font-mono" style={{ fontSize: 10, color: "#27272a" }}>Beta</span>}
      </div>

      {/* ══ Messages ══ */}
      <div
        ref={scrollRef}
        data-native-scroll
        data-lenis-prevent-wheel
        onWheelCapture={handleChatWheel}
        className="relative min-h-0 flex-1 overflow-y-scroll overscroll-contain"
        style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
      >

        {/* Scroll-to-bottom button */}
        <AnimatePresence>
          {showDown && (
            <motion.button
              className="absolute bottom-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)", color: "#71717a" }}
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              whileHover={{ background: "#22263a", color: "#e4e4e7" }}
              onClick={() => {
                stickToBottomRef.current = true;
                scrollToBottom("smooth");
              }}
            >
              <ChevronDown size={15} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Empty state ── */}
        {messages.length === 0 && !loading ? (
          <motion.div
            className="flex min-h-full flex-col items-center px-4 text-center sm:px-6"
            style={{
              paddingTop: "clamp(22px, 4vh, 38px)",
              paddingBottom: 36,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={{ width: 84, height: 128, flexShrink: 0, position: "relative", paddingTop: 24, overflow: "visible" }}>
              <WispMascot size={84} mood="mischief" quote="ask me anything 👀" />
            </div>

            <motion.h2
              className="font-extrabold tracking-tight"
              style={{ fontSize: 23, color: "#fafafa", marginTop: 0, marginBottom: 6 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              How can I help?
            </motion.h2>
            <motion.p
              style={{ fontSize: 13, color: "#52525b", maxWidth: 360, lineHeight: 1.55, marginBottom: 16 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22 }}
            >
              Ask about Solana yields, public wallets, token risk, perps, and protocol exposure.
            </motion.p>

            <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s.label}
                  className="text-left px-3.5 py-2.5 rounded-xl"
                  style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.06)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 + i * 0.07 }}
                  whileHover={{ background: "#0f1226", borderColor: "rgba(255,255,255,0.1)", y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => send(s.prompt)}
                >
                  <p style={{ fontWeight: 650, color: "#a1a1aa", fontSize: 11, marginBottom: 2 }}>{s.label}</p>
                  <p style={{ fontSize: 11, color: "#52525b", lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{s.prompt}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>

        ) : (
          /* ── Message list ── */
          <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto w-full space-y-7">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="group"
                >
                  {msg.role === "user" ? (

                    /* ── User bubble ── */
                    <div className="flex flex-col items-end gap-1.5">
                      {msg.files && msg.files.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-end max-w-[78%]">
                          {msg.files.map((f) => (
                            <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }}>
                              <FileText size={11} strokeWidth={1.5} />
                              <span className="max-w-[140px] truncate">{f.name}</span>
                              <span style={{ color: "#3f3f46" }}>{f.size}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.content && (
                        <div className="max-w-[78%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
                          style={{ background: "#16192e", color: "#e4e4e7", border: "1px solid rgba(255,255,255,0.07)" }}>
                          {msg.content}
                        </div>
                      )}
                      <span style={{ fontSize: 10, color: "#27272a" }}>
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                  ) : (

                    /* ── Wisp message ── */
                    <div className="flex items-start gap-3.5">
                      <div style={{ width: 30, height: 38, flexShrink: 0, position: "relative", marginTop: 2 }}>
                        <WispMascot size={30} mood="happy" />
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-baseline gap-2 mb-2">
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>Wisp</span>
                          <span style={{ fontSize: 10, color: "#27272a" }}>
                            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="text-sm leading-[1.8]" style={{ color: "#a1a1aa" }}>
                          {msg.streaming && streaming === msg.id ? (
                            <TypewriterText
                              text={msg.content}
                              onComplete={() => onStreamDone(msg.id)}
                              onTick={() => {
                                if (stickToBottomRef.current) scrollToBottom("auto");
                              }}
                            />
                          ) : (
                            <Prose text={msg.content} />
                          )}
                        </div>
                        {!msg.streaming && <DashboardVisuals visuals={msg.visuals} />}

                        {/* Message actions — show after streaming done */}
                        {!msg.streaming && (
                          <motion.div
                            className="flex items-center gap-0.5 mt-2.5 -ml-1 opacity-0 group-hover:opacity-100"
                            style={{ transition: "opacity 0.15s" }}
                          >
                            <CopyBtn text={msg.content} />
                            <div className="w-px h-3 mx-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                            <motion.button
                              onClick={() => react(msg.id, "up")}
                              className="flex items-center justify-center w-7 h-7 rounded-lg"
                              style={{ color: msg.reaction === "up" ? "#22c55e" : "#3f3f46" }}
                              whileHover={{ color: "#22c55e", background: "rgba(34,197,94,0.08)" }}
                              whileTap={{ scale: 0.88 }}
                            >
                              <ThumbsUp size={11} />
                            </motion.button>
                            <motion.button
                              onClick={() => react(msg.id, "down")}
                              className="flex items-center justify-center w-7 h-7 rounded-lg"
                              style={{ color: msg.reaction === "down" ? "#f87171" : "#3f3f46" }}
                              whileHover={{ color: "#f87171", background: "rgba(248,113,113,0.08)" }}
                              whileTap={{ scale: 0.88 }}
                            >
                              <ThumbsDown size={11} />
                            </motion.button>
                            {/* Regenerate — only on last wisp message */}
                            {msg.id === lastWispId && !loading && !streaming && (
                              <>
                                <div className="w-px h-3 mx-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                                <motion.button
                                  onClick={regenerate}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg"
                                  style={{ color: "#3f3f46", fontSize: 11 }}
                                  whileHover={{ color: "#a78bfa", background: "rgba(139,92,246,0.08)" }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <RotateCcw size={11} />
                                  <span>Retry</span>
                                </motion.button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <motion.div
                  key="typing"
                  className="flex items-start gap-3.5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div style={{ width: 30, height: 38, flexShrink: 0, position: "relative", marginTop: 2 }}>
                    <WispMascot size={30} mood="thinking" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <ThinkingBubble />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* ══ Voice listening banner ══ */}
      <AnimatePresence>
        {voice.listening && (
          <motion.div
            className="flex-shrink-0 flex items-center justify-center gap-3 py-2.5"
            style={{ background: "rgba(239,68,68,0.06)", borderTop: "1px solid rgba(239,68,68,0.12)" }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Waveform bars */}
            <div className="flex items-center gap-[3px]">
              {[0.4, 0.7, 1, 0.85, 0.55, 0.9, 0.65, 0.4, 0.75, 1].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full"
                  style={{ background: "#f87171" }}
                  animate={{ scaleY: [h * 0.4, h, h * 0.4] }}
                  transition={{ duration: 0.5 + i * 0.07, repeat: Infinity, ease: "easeInOut" }}
                  initial={{ height: 16 }}
                />
              ))}
            </div>
            <span style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>Listening…</span>
            <motion.button
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}
              whileHover={{ background: "rgba(248,113,113,0.2)" }}
              onClick={voice.stop}
            >
              <Square size={10} />
              Stop
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Input area ══ */}
      <div
        className="flex-shrink-0 px-4 md:px-6 pb-5 pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl transition-all duration-150"
            style={{
              background: "#0d1020",
              border: `1px solid ${focused ? "rgba(139,92,246,0.38)" : "rgba(255,255,255,0.08)"}`,
              boxShadow: focused ? "0 0 0 3px rgba(139,92,246,0.07)" : "none",
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          >
            {/* File chips */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  className="px-4 pt-3 pb-1 flex flex-wrap gap-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {files.map((f) => (
                    <motion.div
                      key={f.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs"
                      style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)", color: "#a1a1aa" }}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.88 }}
                    >
                      <FileText size={11} color="#a78bfa" strokeWidth={1.5} />
                      <span className="max-w-[130px] truncate">{f.name}</span>
                      <span style={{ color: "#52525b" }}>{f.size}</span>
                      <button
                        onClick={() => setFiles((p) => p.filter((x) => x.id !== f.id))}
                        style={{ color: "#52525b" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
                      ><X size={10} /></button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea row */}
            <div className="flex items-end gap-2 px-4 py-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={voice.listening ? "Listening - speak now..." : "Ask Wisp about Solana DeFi yields..."}
                rows={1}
                className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed placeholder-[#3f3f46]"
                style={{ color: "#e4e4e7", caretColor: "#a78bfa", minHeight: 24, maxHeight: 180, scrollbarWidth: "none" }}
              />

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Attach */}
                <input ref={fileRef} type="file" multiple className="hidden" onChange={onFileChange} />
                <motion.button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center justify-center w-8 h-8 rounded-xl"
                  style={{ color: "#3f3f46", backgroundColor: "rgba(0,0,0,0)" }}
                  whileHover={{ color: "#a1a1aa", backgroundColor: "rgba(255,255,255,0.06)" }}
                  title="Attach file"
                >
                  <Paperclip size={15} strokeWidth={1.6} />
                </motion.button>

                {/* Voice */}
                {voice.supported && (
                  <motion.button
                    onClick={voice.listening ? voice.stop : voice.start}
                    className="flex items-center justify-center w-8 h-8 rounded-xl relative"
                    style={{
                      color: voice.listening ? "#f87171" : "#3f3f46",
                      backgroundColor: voice.listening ? "rgba(239,68,68,0.1)" : "rgba(0,0,0,0)",
                    }}
                    whileHover={{
                      color: voice.listening ? "#f87171" : "#a1a1aa",
                      backgroundColor: voice.listening ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
                    }}
                    title={voice.listening ? "Stop listening" : "Voice input"}
                  >
                    {voice.listening && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        style={{ border: "1px solid rgba(248,113,113,0.5)" }}
                        animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    )}
                    {voice.listening ? <MicOff size={15} strokeWidth={1.8} /> : <Mic size={15} strokeWidth={1.6} />}
                  </motion.button>
                )}

                {/* Send */}
                <motion.button
                  onClick={() => send()}
                  disabled={!canSend}
                  className="flex items-center justify-center w-8 h-8 rounded-xl"
                  animate={{ backgroundColor: canSend ? "#5b21b6" : "rgba(255,255,255,0.05)" }}
                  style={{ color: canSend ? "#ffffff" : "#3f3f46" }}
                  whileHover={canSend ? { backgroundColor: "#6d28d9", scale: 1.06 } : {}}
                  whileTap={canSend ? { scale: 0.9 } : {}}
                  title="Send (Enter)"
                >
                  <ArrowUp size={15} strokeWidth={2.4} />
                </motion.button>
              </div>
            </div>

            {/* Hints row */}
            <div className="px-4 pb-2.5 flex items-center justify-between">
              <span style={{ fontSize: 10, color: "#27272a" }}>
                Enter ↵ to send · Shift+Enter for newline
              </span>
              <AnimatePresence>
                {input.length > 0 && (
                  <motion.span
                    style={{ fontSize: 10, color: "#27272a" }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    {input.length} chars
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="text-center mt-2" style={{ fontSize: 10, color: "#1c1c2e" }}>
            Public data only. Personal positions need wallet connection or a provided public address.
          </p>
        </div>
      </div>
    </div>
  );
}
