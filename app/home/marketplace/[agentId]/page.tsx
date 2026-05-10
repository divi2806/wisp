import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, LockKeyhole, Network, Sparkles } from "lucide-react";
import WispPageBar from "@/components/WispPageBar";
import { AgentIcon } from "@/components/marketplace/AgentIcon";
import { getMarketplaceAgent, marketplaceAgents } from "@/lib/marketplace/agents";

const UMBRA_LOGO =
  "https://cdn.prod.website-files.com/691b836ec5fafc863304c0a5/691b8729b908879f0ad7f8c2_Umbra-Logo-SVG-4.svg";

export function generateStaticParams() {
  return marketplaceAgents.map((agent) => ({ agentId: agent.id }));
}

export default async function AgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const agent = getMarketplaceAgent(agentId);

  if (!agent) notFound();

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
          className="pointer-events-none absolute left-1/2 top-[-190px] h-[430px] w-[760px] -translate-x-1/2 rounded-full blur-[90px]"
          style={{
            background:
              "radial-gradient(ellipse, rgba(91,33,182,0.18), rgba(91,33,182,0.05) 48%, transparent 72%)",
          }}
        />

        <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/home/marketplace"
            className="mb-7 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-zinc-400 transition-colors duration-150 hover:bg-white/[0.04] hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080b14]"
          >
            <ArrowLeft size={15} strokeWidth={1.8} aria-hidden="true" />
            Marketplace
          </Link>

          <section className="rounded-lg border border-white/[0.07] bg-[#0d1020]/82 p-5 backdrop-blur-xl sm:p-7">
            <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
              <div>
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035]">
                    <AgentIcon icon={agent.icon} color={agent.accent} size={21} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{agent.category}</p>
                    <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-50">{agent.name}</h1>
                  </div>
                </div>

                <p className="max-w-2xl text-base leading-7 text-zinc-300">{agent.capability}</p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {agent.protocols.map((protocol) => (
                    <span
                      key={protocol}
                      className="rounded-full border border-violet-300/12 bg-violet-400/[0.045] px-3 py-1.5 text-xs font-medium text-zinc-300"
                    >
                      {protocol}
                    </span>
                  ))}
                </div>
              </div>

              <aside className="rounded-lg border border-white/[0.07] bg-black/15 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-600">Per call</p>
                <p className="mt-1 text-xl font-extrabold text-zinc-50">{agent.price}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">Metered usage. This does not buy the whole agent.</p>
                <button
                  type="button"
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-violet-300/30 bg-violet-500/14 px-4 text-sm font-semibold text-violet-100 transition-colors duration-150 hover:bg-violet-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1020]"
                >
                  Buy call using x402
                </button>
              </aside>
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]" aria-label="Agent details">
            <div className="rounded-lg border border-white/[0.07] bg-[#0d1020]/78 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-zinc-100">
                <Sparkles size={15} strokeWidth={1.8} aria-hidden="true" />
                What it returns
              </div>
              <div className="grid gap-2">
                {agent.outputs.map((output) => (
                  <div key={output} className="flex min-h-10 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-sm text-zinc-300">
                    <Check size={13} color={agent.accent} strokeWidth={2} aria-hidden="true" />
                    {output}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.07] bg-[#0d1020]/78 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-zinc-100">
                <LockKeyhole size={15} strokeWidth={1.8} aria-hidden="true" />
                Private payment note
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-violet-300/16 bg-violet-400/[0.055] px-4 py-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04]">
                  <Image src={UMBRA_LOGO} alt="Umbra" width={18} height={18} unoptimized className="h-[18px] w-[18px]" />
                </div>
                <p className="text-sm leading-6 text-zinc-300">Private x402 txns from a human or agent using Umbra.</p>
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-white/[0.07] bg-[#0d1020]/78 p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-zinc-100">
              <Network size={15} strokeWidth={1.8} aria-hidden="true" />
              skill.md snippet
            </div>
            <pre className="overflow-x-auto rounded-lg border border-white/[0.08] bg-black/20 p-4 text-[12px] leading-6 text-zinc-300">
              <code>{agent.skillSnippet}</code>
            </pre>
          </section>
        </main>
      </div>
    </div>
  );
}
