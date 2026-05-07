import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, unpackMint } from "@solana/spl-token";
import { createRequire } from "node:module";

import { getSolanaRpcUrl } from "@/lib/market/helius";
import { fetchBirdeyeJson, toBirdeyeNumber } from "@/lib/market/birdeye";
import { SOLANA_TOKEN_DATA } from "@/lib/market/solanaTokenData";
import type {
  ProtocolHealth,
  ProtocolPositionLeg,
  ProtocolPositionMetric,
  ProtocolPositionSnapshot,
  ProtocolProviderResult,
} from "@/lib/defi/protocolPositionTypes";

const DEFAULT_TIMEOUT_MS = 12_000;
const nodeRequire = createRequire(import.meta.url);

type ReadonlyWallet = {
  publicKey: PublicKey;
  signTransaction<T>(transaction: T): Promise<T>;
  signAllTransactions<T>(transactions: T[]): Promise<T[]>;
};

function readonlyWallet(publicKey: PublicKey): ReadonlyWallet {
  return {
    publicKey,
    async signTransaction(transaction) {
      return transaction;
    },
    async signAllTransactions(transactions) {
      return transactions;
    },
  };
}

function shortAddress(address: string | null | undefined) {
  if (!address) return "unknown";
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function stringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "object" && "toBase58" in value && typeof value.toBase58 === "function") {
    return value.toBase58();
  }
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") {
    const text = value.toString();
    return text === "[object Object]" ? null : text;
  }
  return null;
}

function numberValue(value: unknown, divisor = 1): number | null {
  if (value === null || value === undefined) return null;

  let raw: number | null = null;
  if (typeof value === "number") raw = value;
  else if (typeof value === "bigint") raw = Number(value);
  else if (typeof value === "string") raw = Number(value);
  else if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") raw = value.toNumber();
  else if (typeof value === "object" && "toString" in value && typeof value.toString === "function") raw = Number(value.toString());

  if (raw === null || !Number.isFinite(raw)) return null;
  return raw / divisor;
}

function positive(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function signed(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value !== 0;
}

function sumLegUsd(legs: ProtocolPositionLeg[]) {
  const known = legs.map((leg) => leg.valueUsd).filter((value): value is number => typeof value === "number");
  if (!known.length) return null;
  return known.reduce((sum, value) => sum + value, 0);
}

function compactNumber(value: number | null | undefined, maximumFractionDigits = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "n/a";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: Math.abs(value) > 0 && Math.abs(value) < 1 ? 4 : 0,
  }).format(value);
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "n/a";
  return `$${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(value) > 0 && Math.abs(value) < 1 ? 4 : 2,
  }).format(value)}`;
}

function percent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "n/a";
  return `${(value * 100).toFixed(2)}%`;
}

function tokenSymbolFromMint(mintAddress: string | null | undefined) {
  if (!mintAddress) return "unknown";
  const known = Object.entries(SOLANA_TOKEN_DATA).find(([, token]) => token.address === mintAddress);
  return known?.[0] ?? shortAddress(mintAddress);
}

function tokenAmount(rawAmount: unknown, decimals: number | null | undefined) {
  const raw = numberValue(rawAmount);
  if (raw === null) return null;
  return raw / 10 ** (decimals ?? 0);
}

async function fetchMintDecimals(connection: Connection, mints: string[]) {
  const decimals = new Map<string, number>();
  const uniqueMints = [...new Set(mints.filter((mint) => mint && mint !== PublicKey.default.toBase58()))].slice(0, 8);
  if (!uniqueMints.length) return decimals;

  const publicKeys = uniqueMints.map((mint) => new PublicKey(mint));
  const accounts = await connection.getMultipleAccountsInfo(publicKeys).catch(() => []);
  accounts.forEach((account, index) => {
    if (!account) return;
    try {
      const mint = unpackMint(publicKeys[index], account, account.owner);
      decimals.set(publicKeys[index].toBase58(), mint.decimals);
    } catch {
      // Best-effort enrichment only. Position amounts still render without reward decimals.
    }
  });

  return decimals;
}

async function fetchOptionalTokenPrices(mints: string[]) {
  const apiKey = process.env.BIRDEYE_API_KEY?.trim();
  const prices = new Map<string, number>();
  const warnings: string[] = [];
  const uniqueMints = [...new Set(mints.filter(Boolean))].slice(0, 8);
  if (!apiKey || !uniqueMints.length) return { prices, warnings };

  const results = await Promise.allSettled(
    uniqueMints.map(async (mint) => {
      const json = await fetchBirdeyeJson("/defi/price", { address: mint }, apiKey);
      const price = toBirdeyeNumber(json.data?.value) ?? toBirdeyeNumber(json.data?.price);
      if (price !== null) prices.set(mint, price);
    })
  );

  for (const result of results) {
    if (result.status === "rejected") {
      const message = result.reason instanceof Error ? result.reason.message : "Birdeye price lookup failed.";
      warnings.push(message);
    }
  }

  return { prices, warnings: warnings.slice(0, 2) };
}

function healthFromBorrow(suppliedUsd: number | null, borrowedUsd: number | null): ProtocolHealth {
  if (!positive(borrowedUsd)) return "no-borrow";
  if (!positive(suppliedUsd)) return "danger";

  const supplied = suppliedUsd ?? 0;
  const borrowed = borrowedUsd ?? 0;
  const utilization = borrowed / supplied;
  if (utilization < 0.45) return "lower-risk";
  if (utilization < 0.75) return "watch";
  return "danger";
}

function healthFromScore(score: number | null): ProtocolHealth {
  if (score === null || !Number.isFinite(score)) return "unknown";
  if (score >= 80) return "lower-risk";
  if (score >= 40) return "watch";
  return "danger";
}

function healthFromRange(inRange: boolean | null, hasLiquidity: boolean): ProtocolHealth {
  if (!hasLiquidity) return "unknown";
  if (inRange === true) return "lower-risk";
  if (inRange === false) return "watch";
  return "unknown";
}

function decodeName(value: unknown) {
  if (typeof value === "string") return value.replace(/\0/g, "").trim();
  if (Array.isArray(value)) return Buffer.from(value).toString("utf8").replace(/\0/g, "").trim();
  if (value instanceof Uint8Array) return Buffer.from(value).toString("utf8").replace(/\0/g, "").trim();
  return "";
}

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function fetchMarginfiPositions(walletAddress: string): Promise<ProtocolProviderResult> {
  return withTimeout(fetchMarginfiPositionsInner(walletAddress), "MarginFi SDK/RPC");
}

async function fetchMarginfiPositionsInner(walletAddress: string): Promise<ProtocolProviderResult> {
  const owner = new PublicKey(walletAddress);
  const connection = new Connection(getSolanaRpcUrl(), "confirmed");
  const { MarginfiClient, MarginRequirementType, getConfig } = await import("@mrgnlabs/marginfi-client-v2");
  const client = await MarginfiClient.fetch(getConfig("production"), readonlyWallet(owner), connection, { readOnly: true });
  const accounts = await client.getMarginfiAccountsForAuthority(owner);

  const positions: ProtocolPositionSnapshot[] = accounts.map((account, accountIndex) => {
    const deposits: ProtocolPositionLeg[] = [];
    const borrows: ProtocolPositionLeg[] = [];
    const liquidationMetrics: ProtocolPositionMetric[] = [];

    for (const balance of account.activeBalances) {
      const bank = client.getBankByPk(balance.bankPk);
      if (!bank) continue;

      const oraclePrice = client.getOraclePriceByBank(balance.bankPk);
      const quantities = balance.computeQuantityUi(bank);
      const values = oraclePrice ? balance.computeUsdValue(bank, oraclePrice, MarginRequirementType.Equity) : null;
      const rates = bank.computeInterestRates();
      const symbol = bank.tokenSymbol || shortAddress(bank.mint.toBase58());
      const assetAmount = numberValue(quantities.assets);
      const liabilityAmount = numberValue(quantities.liabilities);
      const assetUsd = numberValue(values?.assets);
      const liabilityUsd = numberValue(values?.liabilities);
      const lendingApy = numberValue(rates.lendingRate);
      const borrowingApy = numberValue(rates.borrowingRate);

      if (positive(assetAmount) || positive(assetUsd)) {
        deposits.push({ symbol, amount: assetAmount, valueUsd: assetUsd, apy: lendingApy });
      }
      if (positive(liabilityAmount) || positive(liabilityUsd)) {
        borrows.push({ symbol, amount: liabilityAmount, valueUsd: liabilityUsd, apy: borrowingApy });
      }

      const liquidationPrice = account.computeLiquidationPriceForBank(balance.bankPk);
      if (typeof liquidationPrice === "number" && Number.isFinite(liquidationPrice) && liquidationPrice > 0) {
        liquidationMetrics.push({
          label: `${symbol} liq.`,
          value: money(liquidationPrice),
          tone: "warn",
        });
      }
    }

    const suppliedUsd = sumLegUsd(deposits);
    const borrowedUsd = sumLegUsd(borrows);
    const netUsd =
      typeof suppliedUsd === "number" || typeof borrowedUsd === "number"
        ? (suppliedUsd ?? 0) - (borrowedUsd ?? 0)
        : numberValue(account.computeAccountValue());
    const maintenance = account.computeHealthComponents(MarginRequirementType.Maintenance);
    const freeCollateral = numberValue(account.computeFreeCollateral());
    const accountValue = numberValue(account.computeAccountValue());
    const netApy = numberValue(account.computeNetApy());
    const maintAssets = numberValue(maintenance.assets);
    const maintLiabilities = numberValue(maintenance.liabilities);

    return {
      label: `MarginFi account ${accountIndex + 1} - ${shortAddress(account.address.toBase58())}`,
      positionType: "lend",
      suppliedUsd,
      borrowedUsd,
      netUsd,
      health: healthFromBorrow(maintAssets, maintLiabilities),
      deposits: deposits.slice(0, 6),
      borrows: borrows.slice(0, 6),
      metrics: [
        { label: "Account value", value: money(accountValue) },
        { label: "Free collateral", value: money(freeCollateral), tone: positive(freeCollateral) ? "good" : "warn" },
        { label: "Net APY", value: percent(netApy), tone: positive(netApy) ? "good" : "neutral" },
        { label: "Active banks", value: String(account.activeBalances.length) },
        ...liquidationMetrics.slice(0, 3),
      ],
    };
  });

  return {
    protocol: "MarginFi",
    provider: "MarginFi TS SDK + Solana RPC",
    positions: positions.filter((position) => position.deposits.length || position.borrows.length || position.metrics.length),
    warnings: [],
  };
}

export async function fetchDriftPositions(walletAddress: string): Promise<ProtocolProviderResult> {
  return withTimeout(fetchDriftPositionsInner(walletAddress), "Drift SDK/RPC", 15_000);
}

async function fetchDriftPositionsInner(walletAddress: string): Promise<ProtocolProviderResult> {
  const owner = new PublicKey(walletAddress);
  const connection = new Connection(getSolanaRpcUrl(), "confirmed");
  const drift = await import("@drift-labs/sdk");
  const {
    BASE_PRECISION,
    BulkAccountLoader,
    DriftClient,
    PRICE_PRECISION,
    QUOTE_PRECISION,
    User,
    initialize,
  } = drift as typeof drift & Record<string, any>;
  const driftConfig = initialize({ env: "mainnet-beta" });
  const accountLoader = new BulkAccountLoader(connection, "confirmed", 10_000);
  const accountSubscription = { type: "polling" as const, accountLoader };
  const driftClient = new DriftClient({
    connection,
    wallet: readonlyWallet(owner),
    programID: new PublicKey(driftConfig.DRIFT_PROGRAM_ID),
    accountSubscription,
  });

  await driftClient.subscribe();
  try {
    const accounts = await driftClient.getUserAccountsAndAddressesForAuthority(owner);
    const positions: ProtocolPositionSnapshot[] = [];

    for (const entry of accounts) {
      const userAccount = entry.account;
      const userAccountPublicKey = entry.publicKey;
      const user = new User({
        driftClient,
        userAccountPublicKey,
        accountSubscription,
      });

      await user.subscribe(userAccount);

      try {
        const activePerps = user.getActivePerpPositionsForUserAccount(userAccount);
        const activeSpots = user.getActiveSpotPositionsForUserAccount(userAccount);
        const openOrders = user.getOpenOrdersForUserAccount(userAccount);
        const totalCollateral = numberValue(user.getTotalCollateral("Initial"), numberValue(QUOTE_PRECISION) ?? 1);
        const freeCollateral = numberValue(user.getFreeCollateral("Initial"), numberValue(QUOTE_PRECISION) ?? 1);
        const unrealizedPnl = numberValue(user.getUnrealizedPNL(true), numberValue(QUOTE_PRECISION) ?? 1);
        const leverage = numberValue(user.getLeverage?.(), 10_000);
        const health = healthFromScore(user.getHealth());

        const deposits: ProtocolPositionLeg[] = [];
        const borrows: ProtocolPositionLeg[] = [];
        for (const spotPosition of activeSpots) {
          const market = driftClient.getSpotMarketAccount(spotPosition.marketIndex);
          const marketName = decodeName(market?.name) || `spot-${spotPosition.marketIndex}`;
          const tokenAmount = numberValue(user.getTokenAmount(spotPosition.marketIndex));
          if (tokenAmount === null || tokenAmount === 0) continue;

          const leg = {
            symbol: marketName,
            amount: Math.abs(tokenAmount),
            valueUsd: null,
            apy: null,
          };
          if (tokenAmount > 0) deposits.push(leg);
          else borrows.push(leg);
        }

        const metrics: ProtocolPositionMetric[] = [
          { label: "Subaccount", value: String(userAccount.subAccountId ?? "?") },
          { label: "Total collateral", value: money(totalCollateral) },
          { label: "Free collateral", value: money(freeCollateral), tone: positive(freeCollateral) ? "good" : "warn" },
          { label: "Unrealized PnL", value: money(unrealizedPnl), tone: positive(unrealizedPnl) ? "good" : unrealizedPnl && unrealizedPnl < 0 ? "danger" : "neutral" },
          { label: "Open orders", value: String(openOrders.length) },
        ];
        if (leverage !== null) metrics.push({ label: "Leverage", value: `${compactNumber(leverage, 2)}x`, tone: leverage > 5 ? "warn" : "neutral" });

        for (const perpPosition of activePerps.slice(0, 4)) {
          const market = driftClient.getPerpMarketAccount(perpPosition.marketIndex);
          const marketName = decodeName(market?.name) || `perp-${perpPosition.marketIndex}`;
          const baseSize = numberValue(perpPosition.baseAssetAmount, numberValue(BASE_PRECISION) ?? 1);
          const side = baseSize === null ? "n/a" : baseSize >= 0 ? "long" : "short";
          const liqPrice = numberValue(user.liquidationPrice(perpPosition.marketIndex), numberValue(PRICE_PRECISION) ?? 1);
          const oraclePrice = (() => {
            try {
              return numberValue(driftClient.getOracleDataForPerpMarket(perpPosition.marketIndex)?.price, numberValue(PRICE_PRECISION) ?? 1);
            } catch {
              return null;
            }
          })();

          metrics.push(
            { label: `${marketName} side`, value: side },
            { label: `${marketName} size`, value: compactNumber(baseSize === null ? null : Math.abs(baseSize), 4) },
            { label: `${marketName} oracle`, value: money(oraclePrice) },
            { label: `${marketName} liq.`, value: money(liqPrice), tone: liqPrice ? "warn" : "neutral" }
          );
        }

        positions.push({
          label: `Drift subaccount ${userAccount.subAccountId ?? "?"} - ${shortAddress(userAccountPublicKey.toBase58())}`,
          positionType: activePerps.length ? "perp" : "spot",
          suppliedUsd: totalCollateral,
          borrowedUsd: null,
          netUsd: totalCollateral,
          health,
          deposits: deposits.slice(0, 6),
          borrows: borrows.slice(0, 6),
          metrics,
        });
      } finally {
        await user.unsubscribe().catch(() => undefined);
      }
    }

    return {
      protocol: "Drift",
      provider: "Drift SDK + Drift user account decoder + Solana RPC",
      positions,
      warnings: [],
    };
  } finally {
    await driftClient.unsubscribe().catch(() => undefined);
  }
}

export async function fetchOrcaWhirlpoolPositions(walletAddress: string): Promise<ProtocolProviderResult> {
  return withTimeout(fetchOrcaWhirlpoolPositionsInner(walletAddress), "Orca Whirlpools SDK/RPC");
}

async function fetchOrcaWhirlpoolPositionsInner(walletAddress: string): Promise<ProtocolProviderResult> {
  const [{ address, createSolanaRpc }, { fetchPositionsForOwner, setWhirlpoolsConfig }] = await Promise.all([
    import("@solana/kit"),
    import("@orca-so/whirlpools"),
  ]);
  await setWhirlpoolsConfig("solanaMainnet");
  const rpc = createSolanaRpc(getSolanaRpcUrl());
  const owner = address(walletAddress);
  const owned = (await fetchPositionsForOwner(rpc as any, owner)) as any[];
  const positions: ProtocolPositionSnapshot[] = [];

  for (const item of owned) {
    const children = item.isPositionBundle ? item.positions ?? [] : [item];
    for (const positionAccount of children) {
      const data = positionAccount.data ?? positionAccount;
      const positionAddress = stringValue(positionAccount.address) ?? stringValue(data.positionMint);
      const whirlpool = stringValue(data.whirlpool);
      const positionMint = stringValue(data.positionMint);
      const liquidity = numberValue(data.liquidity);
      const feeOwedA = numberValue(data.feeOwedA);
      const feeOwedB = numberValue(data.feeOwedB);

      positions.push({
        label: `Orca Whirlpool - ${shortAddress(positionAddress ?? positionMint)}`,
        positionType: "clmm",
        suppliedUsd: null,
        borrowedUsd: null,
        netUsd: null,
        health: positive(liquidity) ? "lower-risk" : "unknown",
        deposits: [],
        borrows: [],
        metrics: [
          { label: "Pool", value: shortAddress(whirlpool) },
          { label: "Mint", value: shortAddress(positionMint) },
          { label: "Liquidity", value: compactNumber(liquidity, 0) },
          { label: "Tick range", value: `${data.tickLowerIndex ?? "?"} -> ${data.tickUpperIndex ?? "?"}` },
          { label: "Fee owed A", value: compactNumber(feeOwedA, 0) },
          { label: "Fee owed B", value: compactNumber(feeOwedB, 0) },
        ],
      });
    }
  }

  return {
    protocol: "Orca Whirlpools",
    provider: "Orca Whirlpools SDK fetchPositionsForOwner + Solana RPC",
    positions,
    warnings: [],
  };
}

export async function fetchRaydiumPositions(walletAddress: string): Promise<ProtocolProviderResult> {
  return withTimeout(fetchRaydiumPositionsInner(walletAddress), "Raydium SDK/RPC", 15_000);
}

async function fetchRaydiumPositionsInner(walletAddress: string): Promise<ProtocolProviderResult> {
  const owner = new PublicKey(walletAddress);
  const connection = new Connection(getSolanaRpcUrl(), "confirmed");
  const { PoolFetchType, Raydium, parseTokenAccountResp } = await import("@raydium-io/raydium-sdk-v2");
  const [solAccountResp, tokenAccountResp, token2022AccountResp] = await Promise.all([
    connection.getAccountInfo(owner),
    connection.getTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
    connection.getTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }),
  ]);
  const mergedTokenAccounts = {
    context: tokenAccountResp.context,
    value: [...tokenAccountResp.value, ...token2022AccountResp.value],
  };
  const tokenAccountData = parseTokenAccountResp({
    owner,
    solAccountResp,
    tokenAccountResp: mergedTokenAccounts,
  });
  const raydium = await Raydium.load({
    connection,
    owner,
    tokenAccounts: tokenAccountData.tokenAccounts,
    tokenAccountRawInfos: tokenAccountData.tokenAccountRawInfos,
    disableLoadToken: true,
    disableFeatureCheck: true,
  });

  const [clmmPositions, lockedPositions] = await Promise.all([
    raydium.clmm.getOwnerPositionInfo({}).catch(() => []),
    raydium.clmm.getOwnerLockedPositionInfo({}).catch(() => []),
  ]);

  const positions: ProtocolPositionSnapshot[] = [
    ...clmmPositions.map((position: any) => raydiumClmmSnapshot(position, false)),
    ...lockedPositions.map((entry: any) => raydiumClmmSnapshot(entry.position, true)),
    ...(await raydiumStandardLpSnapshots(raydium, tokenAccountData.tokenAccounts, PoolFetchType)),
  ];

  return {
    protocol: "Raydium",
    provider: "Raydium SDK v2 CLMM position decoder + wallet token accounts + Solana RPC",
    positions,
    warnings: [],
  };
}

async function raydiumStandardLpSnapshots(raydium: any, tokenAccounts: any[], poolFetchType: any): Promise<ProtocolPositionSnapshot[]> {
  const balancesByMint = new Map<string, string>();
  for (const tokenAccount of tokenAccounts) {
    if (tokenAccount.isNative) continue;
    const mint = stringValue(tokenAccount.mint);
    const amount = stringValue(tokenAccount.amount);
    if (!mint || !amount || amount === "0") continue;
    balancesByMint.set(mint, amount);
  }
  if (!balancesByMint.size) return [];

  const snapshots: ProtocolPositionSnapshot[] = [];
  const seenPools = new Set<string>();
  for (let page = 0; page < 8; page += 1) {
    const response = await raydium.api
      .getPoolList({
        type: poolFetchType?.Standard ?? "standard",
        sort: "liquidity",
        order: "desc",
        page,
        pageSize: 100,
      })
      .catch(() => null);
    const pools = response?.data ?? [];
    if (!pools.length) break;

    for (const pool of pools) {
      const lpMint = pool.lpMint?.address;
      if (!lpMint || seenPools.has(pool.id) || !balancesByMint.has(lpMint)) continue;
      seenPools.add(pool.id);

      const rawBalance = numberValue(balancesByMint.get(lpMint));
      const lpDecimals = numberValue(pool.lpMint?.decimals) ?? 0;
      const lpBalance = rawBalance === null ? null : rawBalance / 10 ** lpDecimals;
      const lpPrice = numberValue(pool.lpPrice);
      const suppliedUsd = lpBalance !== null && lpPrice !== null ? lpBalance * lpPrice : null;
      const apr = numberValue(pool.day?.apr);
      const feeApr = numberValue(pool.day?.feeApr);
      const rewardApr = Array.isArray(pool.day?.rewardApr)
        ? pool.day.rewardApr.reduce((sum: number, value: unknown) => sum + (numberValue(value) ?? 0), 0)
        : null;

      snapshots.push({
        label: `Raydium AMM LP - ${pool.mintA?.symbol ?? "A"}/${pool.mintB?.symbol ?? "B"}`,
        positionType: "amm",
        suppliedUsd,
        borrowedUsd: null,
        netUsd: suppliedUsd,
        health: "lower-risk",
        deposits: [
          {
            symbol: pool.lpMint?.symbol ?? "LP",
            amount: lpBalance,
            valueUsd: suppliedUsd,
            apy: apr !== null ? apr / 100 : null,
          },
        ],
        borrows: [],
        metrics: [
          { label: "Pool", value: shortAddress(pool.id) },
          { label: "LP mint", value: shortAddress(lpMint) },
          { label: "LP balance", value: compactNumber(lpBalance, 6) },
          { label: "TVL", value: money(numberValue(pool.tvl)) },
          { label: "24h APR", value: apr === null ? "n/a" : `${apr.toFixed(2)}%`, tone: positive(apr) ? "good" : "neutral" },
          { label: "Fee APR", value: feeApr === null ? "n/a" : `${feeApr.toFixed(2)}%` },
          { label: "Reward APR", value: rewardApr === null ? "n/a" : `${rewardApr.toFixed(2)}%` },
        ],
      });
    }
  }

  return snapshots;
}

function raydiumClmmSnapshot(position: any, locked: boolean): ProtocolPositionSnapshot {
  const nftMint = stringValue(position.nftMint);
  const poolId = stringValue(position.poolId);
  const liquidity = numberValue(position.liquidity);
  const feeA = numberValue(position.tokenFeesOwedA);
  const feeB = numberValue(position.tokenFeesOwedB);

  return {
    label: `Raydium ${locked ? "locked " : ""}CLMM - ${shortAddress(nftMint)}`,
    positionType: "clmm",
    suppliedUsd: null,
    borrowedUsd: null,
    netUsd: null,
    health: positive(liquidity) ? "lower-risk" : "unknown",
    deposits: [],
    borrows: [],
    metrics: [
      { label: "Pool", value: shortAddress(poolId) },
      { label: "NFT mint", value: shortAddress(nftMint) },
      { label: "Liquidity", value: compactNumber(liquidity, 0) },
      { label: "Tick range", value: `${position.tickLower ?? "?"} -> ${position.tickUpper ?? "?"}` },
      { label: "Fee owed A", value: compactNumber(feeA, 0) },
      { label: "Fee owed B", value: compactNumber(feeB, 0) },
      { label: "Locked", value: locked ? "yes" : "no", tone: locked ? "warn" : "neutral" },
    ],
  };
}

export async function fetchMeteoraPositions(walletAddress: string): Promise<ProtocolProviderResult> {
  return withTimeout(fetchMeteoraPositionsInner(walletAddress), "Meteora DLMM SDK/RPC", 15_000);
}

async function fetchMeteoraPositionsInner(walletAddress: string): Promise<ProtocolProviderResult> {
  const owner = new PublicKey(walletAddress);
  const connection = new Connection(getSolanaRpcUrl(), "confirmed");
  const DLMM = nodeRequire("@meteora-ag/dlmm") as any;
  const positionMap = (await DLMM.getAllLbPairPositionsByUser(connection, owner, undefined, {
    chunkSize: 25,
    isParallelExecution: true,
  })) as Map<string, any>;

  const tokenMints = [...positionMap.values()].flatMap((info) => [
    stringValue(info.tokenX?.publicKey ?? info.lbPair?.tokenXMint),
    stringValue(info.tokenY?.publicKey ?? info.lbPair?.tokenYMint),
  ]).filter((mint): mint is string => Boolean(mint));
  const rewardMints = [...positionMap.values()].flatMap((info) =>
    Array.isArray(info.lbPair?.rewardInfos)
      ? info.lbPair.rewardInfos.map((reward: any) => stringValue(reward.mint))
      : []
  ).filter((mint): mint is string => Boolean(mint) && mint !== PublicKey.default.toBase58());
  const [priceResult, rewardDecimals] = await Promise.all([
    fetchOptionalTokenPrices([...tokenMints, ...rewardMints]),
    fetchMintDecimals(connection, rewardMints),
  ]);
  const positions: ProtocolPositionSnapshot[] = [];

  for (const [poolAddress, info] of positionMap.entries()) {
    const lbPair = info.lbPair ?? {};
    const activeBin = numberValue(lbPair.activeId);
    const binStep = numberValue(lbPair.binStep);
    const tokenXMint = stringValue(info.tokenX?.publicKey ?? lbPair.tokenXMint);
    const tokenYMint = stringValue(info.tokenY?.publicKey ?? lbPair.tokenYMint);
    const tokenXDecimals = numberValue(info.tokenX?.mint?.decimals) ?? 0;
    const tokenYDecimals = numberValue(info.tokenY?.mint?.decimals) ?? 0;
    const tokenXSymbol = tokenSymbolFromMint(tokenXMint);
    const tokenYSymbol = tokenSymbolFromMint(tokenYMint);
    const tokenXPrice = tokenXMint ? priceResult.prices.get(tokenXMint) ?? null : null;
    const tokenYPrice = tokenYMint ? priceResult.prices.get(tokenYMint) ?? null : null;
    const rewardOneMint = stringValue(lbPair.rewardInfos?.[0]?.mint);
    const rewardTwoMint = stringValue(lbPair.rewardInfos?.[1]?.mint);
    const rewardOneDecimals = rewardOneMint ? rewardDecimals.get(rewardOneMint) : undefined;
    const rewardTwoDecimals = rewardTwoMint ? rewardDecimals.get(rewardTwoMint) : undefined;
    const rewardOneSymbol = rewardOneMint ? tokenSymbolFromMint(rewardOneMint) : "reward 1";
    const rewardTwoSymbol = rewardTwoMint ? tokenSymbolFromMint(rewardTwoMint) : "reward 2";

    for (const position of info.lbPairPositionsData ?? []) {
      const positionAddress = stringValue(position.publicKey);
      const data = position.positionData ?? {};
      const lowerBin = numberValue(data.lowerBinId);
      const upperBin = numberValue(data.upperBinId);
      const inRange =
        activeBin !== null && lowerBin !== null && upperBin !== null
          ? activeBin >= lowerBin && activeBin <= upperBin
          : null;
      const amountX = tokenAmount(data.totalXAmountExcludeTransferFee ?? data.totalXAmount, tokenXDecimals);
      const amountY = tokenAmount(data.totalYAmountExcludeTransferFee ?? data.totalYAmount, tokenYDecimals);
      const feeX = tokenAmount(data.feeXExcludeTransferFee ?? data.feeX, tokenXDecimals);
      const feeY = tokenAmount(data.feeYExcludeTransferFee ?? data.feeY, tokenYDecimals);
      const claimedFeeX = tokenAmount(data.totalClaimedFeeXAmount, tokenXDecimals);
      const claimedFeeY = tokenAmount(data.totalClaimedFeeYAmount, tokenYDecimals);
      const rewardOne = rewardOneDecimals === undefined ? null : tokenAmount(data.rewardOneExcludeTransferFee ?? data.rewardOne, rewardOneDecimals);
      const rewardTwo = rewardTwoDecimals === undefined ? null : tokenAmount(data.rewardTwoExcludeTransferFee ?? data.rewardTwo, rewardTwoDecimals);
      const valueX = amountX !== null && tokenXPrice !== null ? amountX * tokenXPrice : null;
      const valueY = amountY !== null && tokenYPrice !== null ? amountY * tokenYPrice : null;
      const feeValueX = feeX !== null && tokenXPrice !== null ? feeX * tokenXPrice : null;
      const feeValueY = feeY !== null && tokenYPrice !== null ? feeY * tokenYPrice : null;
      const suppliedUsd =
        typeof valueX === "number" || typeof valueY === "number"
          ? (valueX ?? 0) + (valueY ?? 0)
          : null;
      const unclaimedFeeUsd =
        typeof feeValueX === "number" || typeof feeValueY === "number"
          ? (feeValueX ?? 0) + (feeValueY ?? 0)
          : null;
      const bins = Array.isArray(data.positionBinData) ? data.positionBinData : [];
      const activeBinData = activeBin === null ? null : bins.find((bin: any) => numberValue(bin.binId) === activeBin);
      const lowerBinData = lowerBin === null ? null : bins.find((bin: any) => numberValue(bin.binId) === lowerBin);
      const upperBinData = upperBin === null ? null : [...bins].reverse().find((bin: any) => numberValue(bin.binId) === upperBin);
      const liquidityBins = bins.filter((bin: any) => {
        const liquidity = numberValue(bin.positionLiquidity);
        const binAmountX = numberValue(bin.positionXAmount);
        const binAmountY = numberValue(bin.positionYAmount);
        return positive(liquidity) || positive(binAmountX) || positive(binAmountY);
      }).length;
      const hasLiquidity = positive(amountX) || positive(amountY) || liquidityBins > 0;
      const deposits: ProtocolPositionLeg[] = [];
      if (positive(amountX) || positive(valueX)) {
        deposits.push({ symbol: tokenXSymbol, amount: amountX, valueUsd: valueX, apy: null });
      }
      if (positive(amountY) || positive(valueY)) {
        deposits.push({ symbol: tokenYSymbol, amount: amountY, valueUsd: valueY, apy: null });
      }

      const metrics: ProtocolPositionMetric[] = [
        { label: "Pool", value: shortAddress(poolAddress) },
        { label: "Pair", value: `${tokenXSymbol}/${tokenYSymbol}` },
        { label: "Position", value: shortAddress(positionAddress) },
        { label: "Active bin", value: activeBin === null ? "n/a" : String(activeBin), tone: inRange === false ? "warn" : "neutral" },
        { label: "Bin range", value: `${lowerBin ?? "?"} -> ${upperBin ?? "?"}`, tone: inRange === false ? "warn" : "neutral" },
        { label: "In range", value: inRange === null ? "unknown" : inRange ? "yes" : "no", tone: inRange === false ? "warn" : inRange ? "good" : "neutral" },
        { label: "Bin step", value: binStep === null ? "n/a" : String(binStep) },
        { label: "Liquidity bins", value: String(liquidityBins) },
        { label: `Unclaimed fee ${tokenXSymbol}`, value: compactNumber(feeX, 6) },
        { label: `Unclaimed fee ${tokenYSymbol}`, value: compactNumber(feeY, 6) },
        { label: "Unclaimed fees", value: money(unclaimedFeeUsd), tone: positive(unclaimedFeeUsd) ? "good" : "neutral" },
        { label: `Claimed fee ${tokenXSymbol}`, value: compactNumber(claimedFeeX, 6) },
        { label: `Claimed fee ${tokenYSymbol}`, value: compactNumber(claimedFeeY, 6) },
        { label: "Price range", value: `${lowerBinData?.pricePerToken ?? "?"} -> ${upperBinData?.pricePerToken ?? "?"}` },
        { label: "Active price", value: activeBinData?.pricePerToken ?? "n/a" },
      ];
      if (positive(rewardOne)) metrics.push({ label: `Reward ${rewardOneSymbol}`, value: compactNumber(rewardOne, 6), tone: "good" });
      if (positive(rewardTwo)) metrics.push({ label: `Reward ${rewardTwoSymbol}`, value: compactNumber(rewardTwo, 6), tone: "good" });

      positions.push({
        label: `Meteora DLMM - ${tokenXSymbol}/${tokenYSymbol}`,
        positionType: "clmm",
        suppliedUsd,
        borrowedUsd: null,
        netUsd: suppliedUsd,
        health: healthFromRange(inRange, hasLiquidity),
        deposits,
        borrows: [],
        metrics,
      });
    }
  }

  return {
    protocol: "Meteora",
    provider: "Meteora DLMM SDK getAllLbPairPositionsByUser + Helius/Solana RPC",
    positions,
    warnings: priceResult.warnings,
  };
}
