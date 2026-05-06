// Hardcoded curated token data — avoids the stale community token registry.
// Mint addresses verified from on-chain / Birdeye / Solscan.
export type TokenData = { address: string; name: string };

export const SOLANA_TOKEN_DATA: Record<string, TokenData> = {
  // ── Core / infra ──────────────────────────────────────────────────────────
  SOL:    { address: "So11111111111111111111111111111111111111112",  name: "Solana" },
  USDC:   { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", name: "USD Coin" },
  JUP:    { address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",  name: "Jupiter" },
  JTO:    { address: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwt9sp7A57UZ",  name: "Jito" },
  JLP:    { address: "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4", name: "Jupiter LP" },
  PYTH:   { address: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",  name: "Pyth Network" },
  RAY:    { address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",  name: "Raydium" },
  ORCA:   { address: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",   name: "Orca" },
  MNDE:   { address: "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey",   name: "Marinade" },
  DRIFT:  { address: "DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7",  name: "Drift Protocol" },
  KMNO:   { address: "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS",  name: "Kamino" },
  SLND:   { address: "SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp",  name: "Solend" },
  STEP:   { address: "StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT",  name: "Step Finance" },
  TNSR:   { address: "TNSRxcUxoT9xBG3de7A4n1Y6qJbyvCiJSPYJ14SQb1Y",  name: "Tensor" },
  ZEUS:   { address: "ZEUS1aR7aX8DFFJf5QjWj2ftDDdNTroMNGo8YoQm3Gq",  name: "Zeus Network" },
  NOS:    { address: "nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7",  name: "Nosana" },
  RNDR:   { address: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",   name: "Render" },
  HNT:    { address: "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",  name: "Helium" },
  MOBILE: { address: "mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6",   name: "Helium Mobile" },
  WEN:    { address: "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",   name: "Wen" },

  // ── Meme coins ────────────────────────────────────────────────────────────
  BONK:     { address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",   name: "Bonk" },
  WIF:      { address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",   name: "dogwifhat" },
  POPCAT:   { address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",   name: "Popcat" },
  MEW:      { address: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",    name: "cat in a dogs world" },
  BOME:     { address: "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82",    name: "Book of Meme" },
  MYRO:     { address: "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4",  name: "Myro" },
  SLERF:    { address: "7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7ByyfVHC",   name: "Slerf" },
  SAMO:     { address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",   name: "Samoyedcoin" },
  PENGU:    { address: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",   name: "Pudgy Penguins" },
  MICHI:    { address: "5mbK36SZ7J19An8jFochhQS4of8g6BwUjbeCSxBSoWdp",   name: "michi" },
  GOAT:     { address: "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump",   name: "Goatseus Maximus" },
  PNUT:     { address: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump",   name: "Peanut the Squirrel" },
  CHILLGUY: { address: "Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump",   name: "Chill Guy" },
  AI16Z:    { address: "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC",   name: "ai16z" },
  FARTCOIN: { address: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",   name: "Fartcoin" },
};
