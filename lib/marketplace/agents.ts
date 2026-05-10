export type MarketplaceAgent = {
  id: string;
  name: string;
  category: string;
  price: string;
  icon: "flask" | "coins" | "shield" | "crosshair" | "gauge" | "wallet" | "droplets" | "candles" | "pie";
  accent: string;
  status: string;
  description: string;
  capability: string;
  protocols: string[];
  outputs: string[];
  skillSnippet: string;
};

export const marketplaceAgents: MarketplaceAgent[] = [
  {
    id: "strategy-backtester",
    name: "Strategy Backtester",
    category: "Backtesting",
    price: "0.04 USDC / call",
    icon: "flask",
    accent: "#818cf8",
    status: "Paper-only",
    description: "Simulates strategy rules against candles, fills, drawdown, and risk-adjusted returns.",
    capability: "Built around Wisp backtest and paper-trading surfaces before capital is committed.",
    protocols: ["Jupiter", "Raydium", "Orca", "Kamino"],
    outputs: ["P&L curve", "Max drawdown", "Win rate", "Rule audit"],
    skillSnippet: `# Strategy Backtester
Purpose: Package a repeatable backtesting workflow for Wisp strategy agents.
Triggers: "backtest", "simulate", "paper PnL", "test this rule"
Inputs: market, timeframe, candle interval, entry rule, exit rule, risk limits
Workflow:
- Normalize the requested market and candle interval.
- Replay rules against historical candles without lookahead bias.
- Track fills, equity curve, max drawdown, win rate, and benchmark return.
Output: concise verdict, P&L curve summary, drawdown, fill count, failure modes
Guardrails: paper-only; never present a backtest as guaranteed live performance.`,
  },
  {
    id: "yield-scout",
    name: "Yield Scout",
    category: "Yield Ranking",
    price: "0.03 USDC / call",
    icon: "coins",
    accent: "#fbbf24",
    status: "Live public data",
    description: "Ranks pools by APY, TVL, IL risk, stablecoin exposure, and reward-token dependence.",
    capability: "Uses Wisp's DefiLlama yield context and lower-risk, balanced, high-APY buckets.",
    protocols: ["Kamino", "Jupiter", "Meteora", "Orca"],
    outputs: ["Risk buckets", "APY trend", "TVL screen", "Avoid list"],
    skillSnippet: `# Yield Scout
Purpose: Teach an agent how to rank Solana yield options by usable risk.
Triggers: "best yield", "APY", "earn", "stablecoin", "where should I park"
Inputs: preferred asset, risk tier, stablecoin preference, minimum TVL
Workflow:
- Pull Wisp yield context and remove low-liquidity pools.
- Split pools into lower-risk, balanced, and high-risk buckets.
- Penalize reward-heavy APY, IL risk, falling TVL, and unstable emissions.
Output: ranked pools with protocol, asset, APY, TVL, main risk, avoid/watch note
Guardrails: do not recommend the highest APY blindly; explain the risk tradeoff.`,
  },
  {
    id: "lending-risk",
    name: "Lending Risk Agent",
    category: "Lending",
    price: "0.04 USDC / call",
    icon: "shield",
    accent: "#34d399",
    status: "Partial live",
    description: "Reads public lending obligations, supplied value, borrowed value, APY, and health bands.",
    capability: "Matches Wisp's Kamino and MarginFi position coverage for public or connected wallets.",
    protocols: ["Kamino", "MarginFi"],
    outputs: ["Supplied assets", "Borrow exposure", "Health band", "Liquidation watch"],
    skillSnippet: `# Lending Risk Agent
Purpose: Package a lending-position review workflow for public Solana wallets.
Triggers: "my borrows", "lending health", "collateral", "liquidation risk"
Inputs: public wallet, connected wallet, or .sol address
Workflow:
- Resolve wallet context and supported lending protocols.
- Summarize supplied assets, borrowed assets, net value, borrow APY, and health.
- Flag concentrated collateral, high utilization, and liquidation proximity.
Output: health band, supplied/borrowed breakdown, next checks, missing decoder notes
Guardrails: only use public wallet data; do not imply transaction authority.`,
  },
  {
    id: "perps-sentinel",
    name: "Perps Sentinel",
    category: "Perpetuals",
    price: "0.05 USDC / call",
    icon: "crosshair",
    accent: "#fb7185",
    status: "Market + wallet context",
    description: "Summarizes funding, mark/index context, Drift positions, collateral, PnL, and liq proximity.",
    capability: "Uses Wisp's Drift perps snapshot and Drift account decoder paths when wallet authority data exists.",
    protocols: ["Drift", "Jupiter Perps"],
    outputs: ["Funding context", "P&L snapshot", "Open orders", "Liq estimate"],
    skillSnippet: `# Perps Sentinel
Purpose: Give an agent a safe workflow for perps context and position risk.
Triggers: "perps", "funding", "liquidation", "leverage", "Drift position"
Inputs: market symbol, wallet authority, subaccount context when available
Workflow:
- Separate public market data from wallet-specific position data.
- Read funding, mark/index context, collateral, P&L, open orders, and liq estimate.
- Explain what changed and which risk variable matters most.
Output: market context, position snapshot, liquidation watch, risk action checklist
Guardrails: no certainty about direction; personal risk needs decoded wallet data.`,
  },
  {
    id: "token-risk",
    name: "Token Risk Screener",
    category: "Token Risk",
    price: "0.02 USDC / call",
    icon: "gauge",
    accent: "#38bdf8",
    status: "Live token data",
    description: "Checks liquidity, holders, authorities, volume, FDV, market cap, and warning signals.",
    capability: "Maps to Wisp's Birdeye token overview and token security scorecard flow.",
    protocols: ["Birdeye", "Jupiter Strict List"],
    outputs: ["Risk verdict", "Liquidity checks", "Holder checks", "Invalidation notes"],
    skillSnippet: `# Token Risk Screener
Purpose: Standardize token safety checks before an agent discusses a trade.
Triggers: "is this safe", "rug", "buy risk", "holders", "analyze token"
Inputs: token symbol, mint address, or token name
Workflow:
- Resolve the token and pull liquidity, volume, holders, FDV, and market cap.
- Check mint authority, freeze authority, holder concentration, and liquidity depth.
- Produce a verdict: avoid, watch, speculative, or cleaner setup.
Output: verdict, warnings, token security checks, invalidation conditions
Guardrails: never say guaranteed safe; thin liquidity and unclear authority must be called out.`,
  },
  {
    id: "wallet-decoder",
    name: "Wallet Decoder",
    category: "Portfolio",
    price: "0.03 USDC / call",
    icon: "wallet",
    accent: "#a78bfa",
    status: "Public wallet lookup",
    description: "Turns a wallet or .sol into readable holdings, top tokens, USD estimates, and protocol hints.",
    capability: "Uses Wisp's Helius wallet lookup, SPL token metadata, and protocol exposure heuristics.",
    protocols: ["Helius", "Kamino", "Jupiter", "Drift"],
    outputs: ["Holdings", "Top tokens", "Protocol hints", "Portfolio caveats"],
    skillSnippet: `# Wallet Decoder
Purpose: Convert public wallet data into a readable portfolio brief.
Triggers: "show wallet", "portfolio", "balances", ".sol", "what does this wallet hold"
Inputs: public address, .sol name, or connected wallet public key
Workflow:
- Resolve the wallet and fetch SOL plus SPL token holdings.
- Estimate USD values when prices are available.
- Detect likely protocol exposure from known token and account patterns.
Output: holdings summary, top tokens, approximate values, protocol hints, caveats
Guardrails: public data only; do not claim exact off-chain P&L or hidden balances.`,
  },
  {
    id: "lp-range-manager",
    name: "LP Range Manager",
    category: "LP / AMM",
    price: "0.05 USDC / call",
    icon: "droplets",
    accent: "#2dd4bf",
    status: "Partial live",
    description: "Reads CLMM and DLMM positions, active ranges, raw liquidity, fees, and out-of-range state.",
    capability: "Matches Wisp's Orca Whirlpools, Raydium CLMM, and Meteora DLMM wallet coverage.",
    protocols: ["Orca", "Raydium", "Meteora"],
    outputs: ["Range state", "Liquidity", "Fees owed", "Rebalance cue"],
    skillSnippet: `# LP Range Manager
Purpose: Teach an agent how to inspect concentrated liquidity positions.
Triggers: "LP", "CLMM", "DLMM", "fees", "out of range", "rebalance"
Inputs: public wallet, pool address, position NFT, or pair context
Workflow:
- Detect Orca, Raydium, or Meteora position accounts.
- Read current range, active bin or ticks, raw liquidity, and unclaimed fees.
- Flag out-of-range positions and explain rebalance considerations.
Output: range state, liquidity, fees owed, reward notes, rebalance cue
Guardrails: historical fee P&L requires indexing or repeated snapshots.`,
  },
  {
    id: "paper-execution",
    name: "Paper Execution Agent",
    category: "Trading",
    price: "0.02 USDC / call",
    icon: "candles",
    accent: "#22c55e",
    status: "Paper trading",
    description: "Runs simulated spot orders, tracks fills, average entry, position size, and unrealized PnL.",
    capability: "Built for Wisp's Trade terminal with live prices, paper mode, chart markers, and order state.",
    protocols: ["Jupiter", "GeckoTerminal", "Solana DEX"],
    outputs: ["Paper fills", "Avg entry", "Position PnL", "Execution notes"],
    skillSnippet: `# Paper Execution Agent
Purpose: Package a paper-execution workflow for simulated spot trading.
Triggers: "paper trade", "buy", "sell", "position", "simulate order"
Inputs: symbol, side, size, quote amount, live mark price
Workflow:
- Validate the market and current price source.
- Create a simulated fill and update average entry and open quantity.
- Mark the position against live price and summarize unrealized P&L.
Output: fill ledger entry, average entry, position size, P&L, execution note
Guardrails: paper-only; never imply that a real signed transaction occurred.`,
  },
  {
    id: "prediction-market",
    name: "Prediction Market Agent",
    category: "Prediction",
    price: "0.02 USDC / call",
    icon: "pie",
    accent: "#f472b6",
    status: "Paper-only",
    description: "Explains YES/NO odds, window opens, settlement paths, paper exposure, and overpriced entries.",
    capability: "Maps to Wisp's prediction market terminal and paper share accounting.",
    protocols: ["Polymarket reference", "Wisp paper market"],
    outputs: ["Odds read", "Settlement notes", "Position risk", "Paper shares"],
    skillSnippet: `# Prediction Market Agent
Purpose: Teach an agent how to reason about Wisp paper prediction markets.
Triggers: "YES", "NO", "odds", "settle", "prediction", "is this overpriced"
Inputs: market window, current odds, open price, time remaining, paper shares
Workflow:
- Compare current price movement against the market window open.
- Explain whether YES or NO looks rich, cheap, or fairly priced.
- Summarize settlement mechanics and paper exposure.
Output: probability read, strongest reasons, settlement note, position risk
Guardrails: paper-only; avoid certainty and do not present odds as guaranteed outcome.`,
  },
];

export function getMarketplaceAgent(id: string) {
  return marketplaceAgents.find((agent) => agent.id === id);
}
