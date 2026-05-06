// Ordered list: DeFi/infra first, then meme coins by market cap prominence
export const SOLANA_POPULAR_BASES = [
  // Core
  "SOL", "USDC",
  // DeFi / infra
  "JUP", "JTO", "JLP", "PYTH", "RAY", "ORCA", "MNDE", "DRIFT",
  "KMNO", "SLND", "STEP", "TNSR", "ZEUS", "NOS", "RNDR", "HNT", "MOBILE", "WEN",
  // Meme — large cap
  "BONK", "WIF", "POPCAT", "MEW", "PENGU", "BOME",
  // Meme — mid / cult
  "GOAT", "PNUT", "CHILLGUY", "FARTCOIN", "AI16Z",
  "MYRO", "SLERF", "SAMO", "MICHI",
];

export const SOLANA_POPULAR_SET = new Set(SOLANA_POPULAR_BASES.map((s) => s.toUpperCase()));
