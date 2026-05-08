"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletAdapterNetwork,
  type Adapter,
  type WalletError,
} from "@solana/wallet-adapter-base";
import {
  AlphaWalletAdapter,
  AvanaWalletAdapter,
  BitKeepWalletAdapter,
  BitgetWalletAdapter,
  BitpieWalletAdapter,
  CloverWalletAdapter,
  Coin98WalletAdapter,
  CoinbaseWalletAdapter,
  CoinhubWalletAdapter,
  FractalWalletAdapter,
  HuobiWalletAdapter,
  HyperPayWalletAdapter,
  KeystoneWalletAdapter,
  KrystalWalletAdapter,
  LedgerWalletAdapter,
  MathWalletAdapter,
  NekoWalletAdapter,
  NightlyWalletAdapter,
  NufiWalletAdapter,
  OntoWalletAdapter,
  SafePalWalletAdapter,
  SaifuWalletAdapter,
  SalmonWalletAdapter,
  SkyWalletAdapter,
  SolongWalletAdapter,
  SpotWalletAdapter,
  TokenaryWalletAdapter,
  TokenPocketWalletAdapter,
  TorusWalletAdapter,
  TrezorWalletAdapter,
  TrustWalletAdapter,
  WalletConnectWalletAdapter,
  XDEFIWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo, type ReactNode } from "react";

const NETWORK = WalletAdapterNetwork.Mainnet;

function getClientRpcEndpoint() {
  return (
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
    clusterApiUrl(NETWORK)
  );
}

function getWalletConnectProjectId() {
  return process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() || null;
}

function getAppOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://wisp.ai";
}

function reportWalletError(error: WalletError) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[wisp-wallet]", error.name, error.message);
  }
}

export default function SolanaWalletProvider({
  children,
}: {
  children: ReactNode;
}) {
  const endpoint = useMemo(() => getClientRpcEndpoint(), []);

  const wallets = useMemo<Adapter[]>(() => {
    const adapters: Adapter[] = [
      new CoinbaseWalletAdapter(),
      new TrustWalletAdapter(),
      new LedgerWalletAdapter(),
      new TorusWalletAdapter(),
      new AlphaWalletAdapter(),
      new AvanaWalletAdapter(),
      new BitKeepWalletAdapter(),
      new BitgetWalletAdapter(),
      new BitpieWalletAdapter(),
      new CloverWalletAdapter(),
      new Coin98WalletAdapter(),
      new CoinhubWalletAdapter(),
      new FractalWalletAdapter(),
      new HuobiWalletAdapter(),
      new HyperPayWalletAdapter(),
      new KeystoneWalletAdapter(),
      new KrystalWalletAdapter(),
      new MathWalletAdapter(),
      new NekoWalletAdapter(),
      new NightlyWalletAdapter(),
      new NufiWalletAdapter(),
      new OntoWalletAdapter(),
      new SafePalWalletAdapter(),
      new SaifuWalletAdapter(),
      new SalmonWalletAdapter(),
      new SkyWalletAdapter(),
      new SolongWalletAdapter(),
      new SpotWalletAdapter(),
      new TokenaryWalletAdapter(),
      new TokenPocketWalletAdapter(),
      new TrezorWalletAdapter(),
      new XDEFIWalletAdapter(),
    ];

    const walletConnectProjectId = getWalletConnectProjectId();
    if (walletConnectProjectId && typeof window !== "undefined") {
      adapters.push(
        new WalletConnectWalletAdapter({
          network: NETWORK,
          options: {
            projectId: walletConnectProjectId,
            metadata: {
              name: "Wisp",
              description: "AI co-pilot for Solana DeFi",
              url: getAppOrigin(),
              icons: [],
            },
          },
        })
      );
    }

    return adapters;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        autoConnect={false}
        localStorageKey="wisp.solana.wallet"
        onError={reportWalletError}
        wallets={wallets}
      >
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
