"use client";

import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { useWallet, type Wallet } from "@solana/wallet-adapter-react";
import { flushSync } from "react-dom";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Loader2,
  LogOut,
  PlugZap,
  ShieldCheck,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ConnectWalletButtonProps = {
  variant?: "toolbar" | "panel";
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function walletUrl(wallet: Wallet) {
  const adapter = wallet.adapter as { url?: string };
  return adapter.url;
}

function readinessLabel(readyState: WalletReadyState) {
  if (readyState === WalletReadyState.Installed) return "Installed";
  if (readyState === WalletReadyState.Loadable) return "Web";
  if (readyState === WalletReadyState.Unsupported) return "Unsupported";
  return "Install";
}

function isConnectable(readyState: WalletReadyState) {
  return (
    readyState === WalletReadyState.Installed ||
    readyState === WalletReadyState.Loadable
  );
}

function uniqueWallets(wallets: Wallet[]) {
  const seen = new Set<string>();

  return wallets.filter((wallet) => {
    const name = String(wallet.adapter.name);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

export default function ConnectWalletButton({
  variant = "toolbar",
  className,
}: ConnectWalletButtonProps) {
  const {
    connected,
    connecting,
    disconnecting,
    publicKey,
    wallet,
    wallets,
    select,
    connect,
    disconnect,
  } = useWallet();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const connectRef = useRef(connect);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [pendingWallet, setPendingWallet] = useState<WalletName | null>(null);
  const [approvalWallet, setApprovalWallet] = useState<WalletName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const address = publicKey?.toBase58() ?? null;
  const installedWallets = useMemo(
    () =>
      uniqueWallets(wallets).filter((item) => isConnectable(item.readyState)),
    [wallets]
  );
  const otherWallets = useMemo(
    () =>
      uniqueWallets(wallets).filter((item) => !isConnectable(item.readyState)),
    [wallets]
  );

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function handleWalletChoice(item: Wallet) {
    setError(null);

    if (!isConnectable(item.readyState)) {
      const url = walletUrl(item);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const walletName = item.adapter.name;
    flushSync(() => {
      setApprovalWallet(walletName);
      setPendingWallet(walletName);
      select(walletName);
    });

    try {
      await connectRef.current();
      setWalletModalOpen(false);
      setApprovalWallet(null);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open wallet approval.");
    } finally {
      setPendingWallet(null);
    }
  }

  async function handleOpenApproval() {
    setError(null);
    setPendingWallet(wallet?.adapter.name ?? approvalWallet);
    try {
      await connect();
      setWalletModalOpen(false);
      setApprovalWallet(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open wallet approval.");
    } finally {
      setPendingWallet(null);
    }
  }

  async function handleCopy() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
  }

  async function handleDisconnect() {
    setAccountMenuOpen(false);
    await disconnect();
    select(null);
  }

  const baseButtonClass = cx(
    "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold shadow-[var(--dash-shadow)] transition",
    "border-[var(--dash-border)] bg-[var(--dash-panel-strong)] text-[var(--dash-text)] hover:border-cyan-300/45",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dash-bg)]",
    variant === "panel" ? "h-10 px-4 text-xs" : "h-11 px-4 text-sm",
    className
  );

  return (
    <div ref={rootRef} className="relative">
      {connected && address ? (
        <button
          type="button"
          aria-expanded={accountMenuOpen}
          className={baseButtonClass}
          onClick={() => setAccountMenuOpen((open) => !open)}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
          <span className="font-mono">{shortAddress(address)}</span>
          <ChevronDown size={15} strokeWidth={1.8} />
        </button>
      ) : (
        <button
          type="button"
          className={baseButtonClass}
          disabled={connecting || disconnecting}
          onClick={() => {
            setWalletModalOpen(true);
            setError(null);
          }}
        >
          {connecting || pendingWallet ? (
            <Loader2 size={16} className="animate-spin" strokeWidth={1.8} />
          ) : (
            <WalletIcon size={16} strokeWidth={1.8} />
          )}
          <span>{connecting || pendingWallet ? "Connecting" : "Connect Wallet"}</span>
        </button>
      )}

      {accountMenuOpen && connected && address ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[130] w-72 overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-panel)] shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="border-b border-[var(--dash-border)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--dash-faint)]">
              Connected
            </p>
            <p className="mt-1 truncate font-mono text-xs text-[var(--dash-text)]">
              {address}
            </p>
          </div>
          <div className="p-2">
            <button
              type="button"
              className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[var(--dash-text)] transition hover:bg-[var(--dash-panel-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-focus)]"
              onClick={handleCopy}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied address" : "Copy address"}
            </button>
            <a
              href={`https://solscan.io/account/${address}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-[var(--dash-text)] transition hover:bg-[var(--dash-panel-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-focus)]"
            >
              <ExternalLink size={16} />
              View on Solscan
            </a>
            <button
              type="button"
              className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-rose-200 transition hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70"
              onClick={handleDisconnect}
            >
              <LogOut size={16} />
              Disconnect
            </button>
          </div>
        </div>
      ) : null}

      {walletModalOpen ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-end p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close wallet selector"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => {
              setWalletModalOpen(false);
              setPendingWallet(null);
              setApprovalWallet(null);
              setError(null);
            }}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-dialog-title"
            className="relative z-[121] w-[min(430px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-panel)] shadow-[var(--dash-shadow)] backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--dash-border)] px-5 py-4">
              <div>
                <p
                  id="wallet-dialog-title"
                  className="text-base font-bold text-[var(--dash-text-strong)]"
                >
                  Connect Solana Wallet
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--dash-faint)]">
                  Read-only by default. Wisp only asks for signatures when a
                  transaction flow needs it.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--dash-border)] text-[var(--dash-faint)] transition hover:bg-[var(--dash-panel-soft)] hover:text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-focus)]"
                onClick={() => {
                  setWalletModalOpen(false);
                  setPendingWallet(null);
                  setApprovalWallet(null);
                  setError(null);
                }}
              >
                <X size={16} />
              </button>
            </div>

            {error ? (
              <div className="mx-4 mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-100">
                {error}
              </div>
            ) : null}

            {approvalWallet && !connected ? (
              <div className="mx-4 mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-cyan-100">
                      Waiting for {String(approvalWallet)}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-cyan-100/55">
                      If no wallet popup opened, trigger the approval again.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                    disabled={connecting || pendingWallet !== null}
                    onClick={handleOpenApproval}
                  >
                    {connecting || pendingWallet ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ExternalLink size={13} />
                    )}
                    Open approval
                  </button>
                </div>
              </div>
            ) : null}

            <div className="max-h-[68vh] overflow-y-auto p-3">
              <WalletSection
                emptyText="No installed wallet detected yet. Install Phantom, Backpack, Solflare, or another Solana wallet and refresh."
                items={installedWallets}
                pendingWallet={pendingWallet}
                title="Ready"
                onSelect={handleWalletChoice}
              />

              <WalletSection
                emptyText="No extra adapters available."
                items={otherWallets}
                pendingWallet={pendingWallet}
                title="More Wallets"
                onSelect={handleWalletChoice}
              />
            </div>

            <div className="flex items-center gap-2 border-t border-[var(--dash-border)] px-5 py-3 text-xs text-[var(--dash-faint)]">
              <ShieldCheck size={14} className="text-emerald-300" />
              Public key access only after connect.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WalletSection({
  title,
  items,
  pendingWallet,
  emptyText,
  onSelect,
}: {
  title: string;
  items: Wallet[];
  pendingWallet: WalletName | null;
  emptyText: string;
  onSelect: (wallet: Wallet) => void;
}) {
  return (
    <section className="mb-4 last:mb-0">
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--dash-faint)]">
        {title}
      </p>

      {items.length ? (
        <div className="grid gap-2">
          {items.map((item) => {
            const pending = pendingWallet === item.adapter.name;
            const connectable = isConnectable(item.readyState);
            const url = walletUrl(item);

            return (
              <button
                key={String(item.adapter.name)}
                type="button"
                className={cx(
                  "flex min-h-14 w-full items-center gap-3 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-field)] px-3 py-2 text-left transition",
                  "hover:border-cyan-300/35 hover:bg-cyan-300/[0.06]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
                  !connectable && !url && "cursor-not-allowed opacity-60"
                )}
                disabled={!connectable && !url}
                onClick={() => onSelect(item)}
              >
                {item.adapter.icon ? (
                  // Wallet adapters may provide data or extension URLs that next/image cannot normalize.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-lg"
                    src={item.adapter.icon}
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-100">
                    <PlugZap size={16} />
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--dash-text)]">
                    {String(item.adapter.name)}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--dash-faint)]">
                    {readinessLabel(item.readyState)}
                  </span>
                </span>

                {pending ? (
                  <Loader2
                    size={16}
                    className="shrink-0 animate-spin text-cyan-200"
                  />
                ) : !connectable && url ? (
                  <ExternalLink size={16} className="shrink-0 text-[var(--dash-faint)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-field)] px-3 py-3 text-xs leading-5 text-[var(--dash-faint)]">
          {emptyText}
        </p>
      )}
    </section>
  );
}
