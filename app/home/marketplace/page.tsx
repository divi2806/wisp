import Link from "next/link";
import { ArrowRight, BadgeCheck, LockKeyhole, Store } from "lucide-react";
import WispMascot from "@/components/WispMascot";
import WispPageBar from "@/components/WispPageBar";
import { AgentIcon } from "@/components/marketplace/AgentIcon";
import { marketplaceAgents } from "@/lib/marketplace/agents";

export default function MarketplacePage() {
  return (
    <div className="flex h-screen flex-col">
      <WispPageBar />
      <div
        data-native-scroll
        className="grid-bg relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[-180px] h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-[90px]"
          style={{
            background:
              "radial-gradient(ellipse, rgba(91,33,182,0.18), rgba(91,33,182,0.05) 48%, transparent 72%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="mx-auto mb-8 max-w-3xl text-center">
            <div className="mb-5 flex justify-center">
              <WispMascot size={72} mood="rich" quote="per-call agents" />
            </div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-500/10 px-3.5 py-1.5 text-xs font-medium text-violet-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e]" />
              x402 agent calls
              <span className="text-zinc-700">/</span>
              Umbra privacy rail
            </div>
            <div className="mb-3 flex items-center justify-center gap-3">
              <Store size={18} color="#b4a8f0" strokeWidth={1.8} aria-hidden="true" />
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50 sm:text-4xl">Agent marketplace</h1>
            </div>
            <p className="mx-auto max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Metered DeFi agents for Wisp workflows. Choose an agent to view its dedicated page, skill snippet, and
              x402 per-call purchase action.
            </p>
          </header>

          <section className="mb-5 grid gap-3 md:grid-cols-3" aria-label="Marketplace summary">
            {[
              { label: "Agents", value: marketplaceAgents.length.toString(), icon: Store },
              { label: "Pricing", value: "0.02-0.05 USDC / call", icon: BadgeCheck },
              { label: "Privacy", value: "Umbra x402 txns", icon: LockKeyhole },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-white/[0.07] bg-[#0d1020]/78 px-4 py-3 backdrop-blur-xl">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                  <Icon size={12} strokeWidth={1.8} aria-hidden="true" />
                  {label}
                </div>
                <p className="text-sm font-extrabold text-zinc-100">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Trading agents">
            {marketplaceAgents.map((agent) => (
              <Link
                key={agent.id}
                href={`/home/marketplace/${agent.id}`}
                className="group rounded-lg border border-white/[0.07] bg-[#0d1020]/82 p-4 backdrop-blur-xl transition-colors duration-150 hover:border-violet-300/24 hover:bg-[#111428]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080b14]"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035]">
                      <AgentIcon icon={agent.icon} color={agent.accent} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">{agent.category}</p>
                      <h2 className="mt-1 text-base font-extrabold text-zinc-50">{agent.name}</h2>
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    strokeWidth={1.8}
                    className="mt-1 text-zinc-600 transition-colors duration-150 group-hover:text-violet-300"
                    aria-hidden="true"
                  />
                </div>

                <p className="min-h-12 text-sm leading-6 text-zinc-400">{agent.description}</p>

                <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/[0.06] pt-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-600">Per call</p>
                    <p className="mt-1 text-sm font-extrabold text-zinc-100">{agent.price}</p>
                  </div>
                  <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-bold text-zinc-400">
                    {agent.status}
                  </span>
                </div>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
