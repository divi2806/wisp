import {
  fetchHeliusNativeBalance,
  fetchSolanaTokenAccountsByOwner,
  type ParsedTokenAccount,
} from "@/lib/market/helius";
import { fetchBirdeyeJson, toBirdeyeNumber } from "@/lib/market/birdeye";
import { SOLANA_TOKEN_DATA } from "@/lib/market/solanaTokenData";
import { extractSolDomains, extractSolanaAddresses, shortAddress } from "@/lib/solana/identifiers";

export type WalletTokenHolding = {
  mint: string;
  symbol: string;
  name: string;
  amount: number | null;
  decimals: number | null;
  priceUsd: number | null;
  valueUsd: number | null;
};

export type WalletLookupContext = {
  requested: string | null;
  resolvedAddress: string | null;
  addressLabel: string | null;
  source: "helius";
  nativeSol: {
    amount: number | null;
    valueUsd: number | null;
    priceUsd: number | null;
  };
  totalValueUsd: number | null;
  tokenCount: number;
  nftCount: number | null;
  topTokens: WalletTokenHolding[];
  possibleProtocolExposure: Array<{ protocol: string; reason: string; confidence: "low" | "medium" | "high" }>;
  warnings: string[];
};

const WALLET_QUERY_RE = /\b(wallet|address|hold|holds|holding|holdings|portfolio|balance|balances|net\s*worth|worth|owns|tokens?)\b/i;
const SOL_MINT = "So11111111111111111111111111111111111111112";
const KNOWN_TOKENS_BY_MINT = new Map(
  Object.entries(SOLANA_TOKEN_DATA).map(([symbol, token]) => [token.address, { symbol, name: token.name }])
);

function toNumber(value: unknown) {
  const number = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function toParsedHolding(account: ParsedTokenAccount): WalletTokenHolding | null {
  const info = account.account?.data?.parsed?.info;
  const mint = info?.mint;
  const tokenAmount = info?.tokenAmount;
  if (!mint || !tokenAmount) return null;

  const amount =
    toNumber(tokenAmount.uiAmount) ??
    toNumber(tokenAmount.uiAmountString) ??
    (toNumber(tokenAmount.amount) !== null && toNumber(tokenAmount.decimals) !== null
      ? (toNumber(tokenAmount.amount) ?? 0) / 10 ** (toNumber(tokenAmount.decimals) ?? 0)
      : null);
  if ((amount ?? 0) <= 0) return null;

  const known = KNOWN_TOKENS_BY_MINT.get(mint);
  return {
    mint,
    symbol: known?.symbol ?? shortAddress(mint),
    name: known?.name ?? shortAddress(mint),
    amount,
    decimals: toNumber(tokenAmount.decimals),
    priceUsd: null,
    valueUsd: null,
  };
}

function prioritizePriceMints(holdings: WalletTokenHolding[]) {
  const known = holdings.filter((holding) => KNOWN_TOKENS_BY_MINT.has(holding.mint));
  const unknown = holdings.filter((holding) => !KNOWN_TOKENS_BY_MINT.has(holding.mint));
  return [...known, ...unknown].map((holding) => holding.mint);
}

function mergeHoldingsByMint(holdings: WalletTokenHolding[]) {
  const merged = new Map<string, WalletTokenHolding>();
  for (const holding of holdings) {
    const existing = merged.get(holding.mint);
    if (!existing) {
      merged.set(holding.mint, { ...holding });
      continue;
    }

    merged.set(holding.mint, {
      ...existing,
      amount:
        existing.amount === null && holding.amount === null
          ? null
          : (existing.amount ?? 0) + (holding.amount ?? 0),
    });
  }
  return [...merged.values()];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBirdeyePrices(mints: string[]) {
  const apiKey = process.env.BIRDEYE_API_KEY?.trim();
  const uniqueMints = [...new Set(mints.filter(Boolean))].slice(0, 24);
  const prices = new Map<string, number>();
  const warnings: string[] = [];
  if (!apiKey || uniqueMints.length === 0) return { prices, warnings };

  for (const mint of uniqueMints) {
    try {
      const json = await fetchBirdeyeJson("/defi/price", { address: mint }, apiKey);
      const price = toBirdeyeNumber(json.data?.value) ?? toBirdeyeNumber(json.data?.price);
      if (price !== null) prices.set(mint, price);
      await sleep(120);
    } catch (err: unknown) {
      warnings.push(err instanceof Error ? err.message : String(err));
      if (warnings.length >= 2) break;
    }
  }

  return { prices, warnings: warnings.slice(0, 2) };
}

async function fetchParsedWalletHoldings(ownerAddress: string) {
  const tokenAccounts = await fetchSolanaTokenAccountsByOwner(ownerAddress);
  const holdings = tokenAccounts.accounts
    .map(toParsedHolding)
    .filter((holding): holding is WalletTokenHolding => Boolean(holding));

  return {
    holdings,
    warnings: tokenAccounts.warnings,
  };
}

async function resolveSolDomain(domain: string): Promise<{ address: string | null; warning?: string }> {
  const normalized = domain.toLowerCase().replace(/\.sol$/, "");
  const resolverBase = process.env.SNS_RESOLVER_URL?.trim() || "https://sns-sdk-proxy.bonfida.workers.dev/resolve";

  try {
    const res = await fetch(`${resolverBase.replace(/\/+$/, "")}/${encodeURIComponent(normalized)}`, {
      headers: { Accept: "application/json,text/plain" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return { address: null, warning: `SNS resolver failed for ${domain} (${res.status}).` };
    }

    const text = await res.text();
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      const address =
        typeof json.owner === "string" ? json.owner :
        typeof json.address === "string" ? json.address :
        typeof json.pubkey === "string" ? json.pubkey :
        typeof json.result === "string" ? json.result :
        null;
      return { address, warning: address ? undefined : `SNS resolver did not return an address for ${domain}.` };
    } catch {
      const trimmed = text.trim();
      return { address: trimmed.length >= 32 ? trimmed : null, warning: trimmed.length >= 32 ? undefined : `SNS resolver did not return an address for ${domain}.` };
    }
  } catch (err: unknown) {
    return {
      address: null,
      warning: err instanceof Error ? `SNS resolution failed for ${domain}: ${err.message}` : `SNS resolution failed for ${domain}.`,
    };
  }
}

function detectProtocolExposure(holdings: WalletTokenHolding[]) {
  const exposures: WalletLookupContext["possibleProtocolExposure"] = [];
  const joined = holdings.map((holding) => `${holding.symbol} ${holding.name}`).join(" ").toLowerCase();
  const checks: Array<[string, RegExp, string]> = [
    ["Kamino", /\b(kamino|kmno|k-lp|klp|usd[chg]|jitosol|msol)\b/i, "Wallet has tokens commonly used around Kamino lending/vault strategies."],
    ["Jupiter", /\b(jup|jlp|jupiter)\b/i, "Wallet has Jupiter/JLP-related exposure."],
    ["Drift", /\b(drift|dsol|fuel)\b/i, "Wallet has Drift-related tokens; active perp positions still need Drift account decoding."],
    ["MarginFi", /\b(marginfi|mfi|lst|ylst)\b/i, "Wallet has tokens often seen around MarginFi/LST strategies."],
    ["Meteora", /\b(meteora|dlmm|m3m3|met)\b/i, "Wallet may have Meteora/DLMM exposure."],
    ["Orca", /\b(orca|whirlpool)\b/i, "Wallet may have Orca/Whirlpools exposure."],
    ["Raydium", /\b(ray|raydium|clmm)\b/i, "Wallet may have Raydium AMM/CLMM exposure."],
  ];

  for (const [protocol, pattern, reason] of checks) {
    if (pattern.test(joined)) {
      exposures.push({ protocol, reason, confidence: "medium" });
    }
  }

  return exposures;
}

export function shouldFetchWalletContext(message: string) {
  return WALLET_QUERY_RE.test(message) && (extractSolanaAddresses(message).length > 0 || extractSolDomains(message).length > 0);
}

export async function fetchWalletLookupContext(message: string): Promise<WalletLookupContext | null> {
  const addresses = extractSolanaAddresses(message, 1);
  const domains = extractSolDomains(message, 1);
  const requested = domains[0] ?? addresses[0] ?? null;
  if (!requested) return null;

  const warnings: string[] = [];
  let resolvedAddress: string | null = addresses[0] ?? null;
  if (!resolvedAddress && domains[0]) {
    const resolved = await resolveSolDomain(domains[0]);
    resolvedAddress = resolved.address;
    if (resolved.warning) warnings.push(resolved.warning);
  }

  if (!resolvedAddress) {
    return {
      requested,
      resolvedAddress: null,
      addressLabel: requested,
      source: "helius",
      nativeSol: { amount: null, valueUsd: null, priceUsd: null },
      totalValueUsd: null,
      tokenCount: 0,
      nftCount: null,
      topTokens: [],
      possibleProtocolExposure: [],
      warnings,
    };
  }

  try {
    const [balanceLamports, parsedHoldings] = await Promise.all([
      fetchHeliusNativeBalance(resolvedAddress).catch(() => null),
      fetchParsedWalletHoldings(resolvedAddress),
    ]);
    warnings.push(...parsedHoldings.warnings.slice(0, 2));
    const rawHoldings = mergeHoldingsByMint(parsedHoldings.holdings);

    const birdeyePrices = await fetchBirdeyePrices([SOL_MINT, ...prioritizePriceMints(rawHoldings)]);
    warnings.push(...birdeyePrices.warnings);

    const nativeSolAmount = (balanceLamports ?? 0) / 1_000_000_000;
    const nativeSolPrice = birdeyePrices.prices.get(SOL_MINT) ?? null;
    const nativeSolValue = nativeSolPrice === null ? null : nativeSolAmount * nativeSolPrice;
    const holdings = rawHoldings
      .map((holding) => {
        const priceUsd = birdeyePrices.prices.get(holding.mint) ?? holding.priceUsd;
        return {
          ...holding,
          priceUsd,
          valueUsd: holding.amount !== null && priceUsd !== null ? holding.amount * priceUsd : holding.valueUsd,
        };
      })
      .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
    const tokenValue = holdings.reduce((sum, holding) => sum + (holding.valueUsd ?? 0), 0);

    return {
      requested,
      resolvedAddress,
      addressLabel: domains[0] ?? shortAddress(resolvedAddress),
      source: "helius",
      nativeSol: {
        amount: nativeSolAmount,
        valueUsd: nativeSolValue,
        priceUsd: nativeSolPrice,
      },
      totalValueUsd: tokenValue + (nativeSolValue ?? 0),
      tokenCount: holdings.length,
      nftCount: null,
      topTokens: holdings.slice(0, 12),
      possibleProtocolExposure: detectProtocolExposure(holdings),
      warnings,
    };
  } catch (err: unknown) {
    return {
      requested,
      resolvedAddress,
      addressLabel: domains[0] ?? shortAddress(resolvedAddress),
      source: "helius",
      nativeSol: { amount: null, valueUsd: null, priceUsd: null },
      totalValueUsd: null,
      tokenCount: 0,
      nftCount: null,
      topTokens: [],
      possibleProtocolExposure: [],
      warnings: [...warnings, err instanceof Error ? err.message : String(err)],
    };
  }
}
