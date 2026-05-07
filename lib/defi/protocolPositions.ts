import { fetchKaminoPublicPositions, type KaminoObligationPosition } from "@/lib/defi/kamino";
import {
  fetchDriftPositions,
  fetchMarginfiPositions,
  fetchMeteoraPositions,
  fetchOrcaWhirlpoolPositions,
  fetchRaydiumPositions,
} from "@/lib/defi/liveProtocolPositions";
import type { ProtocolPositionSnapshot, ProtocolProviderResult } from "@/lib/defi/protocolPositionTypes";
import type { WalletLookupContext } from "@/lib/defi/walletLookup";

export type ProtocolSupportStatus =
  | "live"
  | "partial-live"
  | "market-live"
  | "needs-decoder"
  | "not-configured";

export type ProtocolPositionContext = {
  requestedProtocols: string[];
  walletAddress: string | null;
  supported: Array<{
    protocol: string;
    status: ProtocolSupportStatus;
    provider: string;
    apiKeyRequired: boolean;
    walletRequirement: "none" | "public-address" | "connected-wallet";
    detail: string;
    needs: string[];
    positions?: ProtocolPositionSnapshot[];
  }>;
  warnings: string[];
};

type ProtocolCapability = {
  key: string;
  label: string;
  aliases: string[];
  status: ProtocolSupportStatus;
  provider: string;
  apiKeyRequired: boolean;
  walletRequirement: "none" | "public-address" | "connected-wallet";
  detail: string;
  needs: string[];
};

const POSITION_RE = /\b(position|positions|vault|vaults|lend|lending|borrow|borrows|debt|collateral|lp|dlmm|perp|perps|health|liquidation|pnl|deposit|deposits|exposure)\b/i;
const INTEGRATION_RE = /\b(api|apis|sdk|decoder|decoders|endpoint|endpoints|public\s+endpoint|keys?|integration|integrate|source|sources|coverage|support)\b/i;

const PROTOCOL_CAPABILITIES: ProtocolCapability[] = [
  {
    key: "kamino",
    label: "Kamino",
    aliases: ["kamino", "kmno", "klend", "kvault"],
    status: "partial-live",
    provider: "Kamino public REST API + Helius wallet address",
    apiKeyRequired: false,
    walletRequirement: "public-address",
    detail:
      "Can fetch public KLend obligations/reserve APYs for a provided wallet address. Strategy vault and shareholder PnL still need deeper Kamino strategy decoding for full coverage.",
    needs: ["Kamino SDK for complete vault/shareholder positions", "Reserve/oracle reconciliation for production-grade liquidation math"],
  },
  {
    key: "jupiter",
    label: "Jupiter Lend",
    aliases: ["jupiter", "jup", "jupiter lend", "jlp"],
    status: "needs-decoder",
    provider: "Jupiter Lend SDK/account decoder. Jupiter Perps disabled for now.",
    apiKeyRequired: false,
    walletRequirement: "public-address",
    detail:
      "Can flag JUP/JLP token exposure today. Exact lend deposits, borrow NFTs, and JLP composition need Jupiter account decoding. Jupiter Perps is not used until an indexer/stable endpoint is available.",
    needs: ["Jupiter Lend account decoder/read SDK", "JLP pool composition data"],
  },
  {
    key: "drift",
    label: "Drift",
    aliases: ["drift", "dsol"],
    status: "partial-live",
    provider: "Drift SDK/account decoder + Helius/Solana RPC",
    apiKeyRequired: false,
    walletRequirement: "public-address",
    detail:
      "Can fetch Drift subaccounts, active perp/spot positions, collateral, free collateral, unrealized PnL, open orders, health, and liquidation-price estimates from public wallet authority data.",
    needs: ["Drift Data API or custom storage only for high-volume dashboards/history, not for current wallet snapshots"],
  },
  {
    key: "marginfi",
    label: "MarginFi",
    aliases: ["marginfi", "mfi"],
    status: "partial-live",
    provider: "MarginFi SDK + Helius/RPC",
    apiKeyRequired: false,
    walletRequirement: "public-address",
    detail:
      "Can fetch current MarginFi accounts, supplied assets, borrows, free collateral, net APY, health components, and per-bank liquidation prices from SDK/RPC.",
    needs: ["Historical PnL/activity indexing only if we want time-series analytics"],
  },
  {
    key: "meteora",
    label: "Meteora",
    aliases: ["meteora", "dlmm"],
    status: "partial-live",
    provider: "Meteora DLMM SDK + Helius/Solana RPC",
    apiKeyRequired: false,
    walletRequirement: "public-address",
    detail:
      "Can fetch current DLMM position accounts for a public wallet, active bin, bin range, token X/Y amounts, unclaimed fees, claimed fees, rewards, and in-range/out-of-range state from SDK/RPC.",
    needs: ["Historical fee PnL and impermanent-loss time series need indexing or repeated snapshots"],
  },
  {
    key: "orca",
    label: "Orca Whirlpools",
    aliases: ["orca", "whirlpool", "whirlpools"],
    status: "partial-live",
    provider: "Orca Whirlpools SDK + position NFTs",
    apiKeyRequired: false,
    walletRequirement: "public-address",
    detail:
      "Can fetch current Whirlpool position NFTs/bundles, pool address, tick range, raw liquidity, and raw fees owed from SDK/RPC.",
    needs: ["Historical fee PnL and impermanent-loss time series need indexing or repeated snapshots"],
  },
  {
    key: "raydium",
    label: "Raydium",
    aliases: ["raydium", "ray", "clmm"],
    status: "partial-live",
    provider: "Raydium SDK/API v3 + LP/CLMM position decoding",
    apiKeyRequired: false,
    walletRequirement: "public-address",
    detail:
      "Can fetch current Raydium CLMM/locked CLMM positions, pool IDs, tick ranges, raw liquidity, and raw unclaimed fees through SDK/RPC.",
    needs: ["Standard AMM/CPMM LP attribution across all pools and historical fees need Raydium API coverage or indexing"],
  },
];

function requestedProtocolKeys(message: string) {
  const lower = message.toLowerCase();
  return PROTOCOL_CAPABILITIES
    .filter((capability) => capability.aliases.some((alias) => lower.includes(alias)))
    .map((capability) => capability.key);
}

function isGenericProtocolQuestion(message: string) {
  return POSITION_RE.test(message) || INTEGRATION_RE.test(message);
}

export function shouldFetchProtocolPositions(message: string) {
  return isGenericProtocolQuestion(message) || requestedProtocolKeys(message).length > 0;
}

function positionToVisual(position: KaminoObligationPosition) {
  return {
    label: `${position.market} - ${position.obligationAddress.slice(0, 4)}...${position.obligationAddress.slice(-4)}`,
    positionType: "lend" as const,
    suppliedUsd: position.suppliedUsd,
    borrowedUsd: position.borrowedUsd,
    netUsd: position.netUsd,
    health: position.health,
    deposits: position.deposits.slice(0, 4).map((leg) => ({
      symbol: leg.symbol,
      valueUsd: leg.valueUsd,
      apy: leg.apy,
    })),
    borrows: position.borrows.slice(0, 4).map((leg) => ({
      symbol: leg.symbol,
      valueUsd: leg.valueUsd,
      apy: leg.apy,
    })),
    metrics: [
      { label: "Market", value: position.market },
      { label: "Obligation", value: `${position.obligationAddress.slice(0, 4)}...${position.obligationAddress.slice(-4)}` },
    ],
  };
}

async function fetchProviderSafe(
  key: string,
  label: string,
  walletAddress: string,
  fetcher: (walletAddress: string) => Promise<ProtocolProviderResult>
) {
  try {
    const result = await fetcher(walletAddress);
    return { key, result, warning: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      key,
      result: null,
      warning: `${label} live lookup failed: ${message}`,
    };
  }
}

export async function buildProtocolPositionContext(
  message: string,
  wallet: WalletLookupContext | null
): Promise<ProtocolPositionContext | null> {
  const explicitKeys = requestedProtocolKeys(message);
  const exposureKeys = wallet?.possibleProtocolExposure
    .map((item) => item.protocol.toLowerCase())
    .flatMap((protocol) => requestedProtocolKeys(protocol)) ?? [];
  const shouldBuild = shouldFetchProtocolPositions(message) || exposureKeys.length > 0;
  if (!shouldBuild) return null;

  const genericAsk = isGenericProtocolQuestion(message);
  const selectedKeys = explicitKeys.length || exposureKeys.length
    ? [...new Set([...explicitKeys, ...exposureKeys])]
    : genericAsk
      ? PROTOCOL_CAPABILITIES.map((capability) => capability.key)
      : [];

  const selected = PROTOCOL_CAPABILITIES.filter((capability) => selectedKeys.includes(capability.key));
  const walletAddress = wallet?.resolvedAddress ?? null;
  const warnings: string[] = [];
  let kaminoPositions: Awaited<ReturnType<typeof fetchKaminoPublicPositions>> | null = null;
  const providerResults = new Map<string, ProtocolProviderResult>();

  if (selectedKeys.includes("kamino") && walletAddress) {
    kaminoPositions = await fetchKaminoPublicPositions(walletAddress);
    warnings.push(...kaminoPositions.warnings.slice(0, 2));
  }

  if (walletAddress) {
    const liveFetches: Array<Promise<Awaited<ReturnType<typeof fetchProviderSafe>>>> = [];
    if (selectedKeys.includes("drift")) {
      liveFetches.push(fetchProviderSafe("drift", "Drift", walletAddress, fetchDriftPositions));
    }
    if (selectedKeys.includes("marginfi")) {
      liveFetches.push(fetchProviderSafe("marginfi", "MarginFi", walletAddress, fetchMarginfiPositions));
    }
    if (selectedKeys.includes("meteora")) {
      liveFetches.push(fetchProviderSafe("meteora", "Meteora", walletAddress, fetchMeteoraPositions));
    }
    if (selectedKeys.includes("orca")) {
      liveFetches.push(fetchProviderSafe("orca", "Orca", walletAddress, fetchOrcaWhirlpoolPositions));
    }
    if (selectedKeys.includes("raydium")) {
      liveFetches.push(fetchProviderSafe("raydium", "Raydium", walletAddress, fetchRaydiumPositions));
    }

    const liveResults = await Promise.all(liveFetches);
    for (const item of liveResults) {
      if (item.result) {
        providerResults.set(item.key, item.result);
        warnings.push(...item.result.warnings.slice(0, 2));
      }
      if (item.warning) warnings.push(item.warning);
    }
  }

  if (!walletAddress && selected.some((capability) => capability.walletRequirement !== "none")) {
    warnings.push("No wallet address was detected. Exact public protocol positions require a wallet address or resolved .sol name until wallet connection is live.");
  }

  const supported = selected.map((capability) => {
    const positions =
      capability.key === "kamino" && kaminoPositions
        ? kaminoPositions.positions.map(positionToVisual)
        : providerResults.get(capability.key)?.positions;
    const providerResult = providerResults.get(capability.key);

    return {
      protocol: capability.label,
      status:
        (capability.key === "kamino" && kaminoPositions) || providerResult
          ? "live" as const
          : capability.status,
      provider: providerResult?.provider ?? capability.provider,
      apiKeyRequired: capability.apiKeyRequired,
      walletRequirement: capability.walletRequirement,
      detail:
        capability.key === "kamino" && kaminoPositions
          ? kaminoPositions.positions.length
            ? `Found ${kaminoPositions.positions.length} public Kamino obligation(s) across ${kaminoPositions.marketsChecked} checked markets.`
            : `Checked ${kaminoPositions.marketsChecked} Kamino markets and found no active public KLend obligations for this wallet.`
          : providerResult
            ? providerResult.positions.length
              ? `Found ${providerResult.positions.length} live ${capability.label} position snapshot(s) for this public wallet.`
              : `Checked ${capability.label} live SDK/RPC data and found no active positions for this public wallet.`
          : capability.detail,
      needs: capability.needs,
      positions,
    };
  });

  return {
    requestedProtocols: selected.map((capability) => capability.label),
    walletAddress,
    supported,
    warnings,
  };
}
