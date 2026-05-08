import { NextResponse } from "next/server";
import { SOLANA_POPULAR_BASES } from "@/lib/market/solanaPopular";
import { SOLANA_TOKEN_DATA } from "@/lib/market/solanaTokenData";

// Pyth Hermes price feed IDs — real-time oracle, no key, no rate limits
const PYTH_IDS: Record<string, string> = {
  SOL:    "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  JUP:    "0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996",
  JTO:    "0xb43660a5f790c69354b0729a5ef9d50d68f1df92107540210b9cccba1f947cc2",
  PYTH:   "0x0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff",
  RAY:    "0x91568baa8beb53db23eb3fb7f22c6e8bd303d103919e19733f2bb642d3e7987a",
  ORCA:   "0x37505261e557e251290b8c8899453064e8d760ed5c65a779726f2490980da74c",
  DRIFT:  "0x5c1690b27bb02446db17cdda13ccc2c1d609ad6d2ef5bf4983a85ea8b6f19d07",
  BONK:   "0x72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419",
  WIF:    "0x4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc",
  POPCAT: "0xb9312a7ee50e189ef045aa3c7842e099b061bd9bdc99ac645956c3b660dc8cce",
  HNT:    "0x649fdd7ec08e8e2a20f425729854e90293dcbe2376abc47197a14da6ff339756",
  KMNO:   "0xb17e5bc5de742a8a378b54c9c75442b7d51e30ada63f28d9bd28d3c0e26511a0",
};

// CoinGecko IDs for tokens without Pyth feeds — batched in one request
const COINGECKO_IDS: Record<string, string> = {
  JLP:      "jupiter-perpetuals-liquidity-provider-token",
  MNDE:     "marinade",
  SLND:     "solend",
  STEP:     "step-finance",
  TNSR:     "tensor",
  ZEUS:     "zeus-network",
  NOS:      "nosana",
  RNDR:     "render-token",
  MOBILE:   "helium-mobile",
  WEN:      "wen-4",
  MEW:      "cat-in-a-dogs-world",
  PENGU:    "pudgy-penguins",
  BOME:     "book-of-meme",
  GOAT:     "goatseus-maximus",
  PNUT:     "peanut-the-squirrel",
  CHILLGUY: "chill-guy",
  FARTCOIN: "fartcoin",
  AI16Z:    "ai16z",
  MYRO:     "myro",
  SLERF:    "slerf",
  SAMO:     "samoyedcoin",
  MICHI:    "michi",
};

type PythParsed = { id: string; price: { price: string; expo: number }; ema_price?: { price: string; expo: number } };

type PythEntry = { symbol: string; id: string };

function pythId(id: string) {
  return id.replace(/^0x/, "");
}

function priceFromPyth(item: PythParsed) {
  const price = Number(item.price.price) * Math.pow(10, item.price.expo);
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function getPythBatch(entries: PythEntry[]): Promise<Record<string, number>> {
  const params = entries.map((e) => `ids[]=${pythId(e.id)}`).join("&");
  const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 10 },
  });
  if (!res.ok) throw new Error(`Pyth ${res.status}`);

  const json = (await res.json()) as { parsed?: PythParsed[] };
  const out: Record<string, number> = {};
  for (const item of json.parsed ?? []) {
    const entry = entries.find((e) => pythId(e.id) === pythId(item.id));
    if (!entry) continue;
    const price = priceFromPyth(item);
    if (price !== null) out[entry.symbol] = price;
  }
  return out;
}

async function getPythPrices(symbols: string[]): Promise<Record<string, number>> {
  const entries = symbols
    .map((s) => ({ symbol: s, id: PYTH_IDS[s] }))
    .filter((x): x is { symbol: string; id: string } => Boolean(x.id));
  if (!entries.length) return {};

  try {
    return await getPythBatch(entries);
  } catch (batchErr) {
    const settled = await Promise.allSettled(entries.map((entry) => getPythBatch([entry])));
    const out: Record<string, number> = {};
    const failed: string[] = [];

    for (let i = 0; i < settled.length; i += 1) {
      const result = settled[i];
      if (result.status === "fulfilled") {
        Object.assign(out, result.value);
      } else {
        failed.push(entries[i].symbol);
      }
    }

    if (failed.length) {
      console.warn("[dex/markets] Pyth skipped feeds:", failed.join(","), batchErr instanceof Error ? batchErr.message : batchErr);
    }

    return out;
  }
}

async function getCoinGeckoPrices(symbols: string[]): Promise<Record<string, number>> {
  const entries = symbols
    .map((s) => ({ symbol: s, id: COINGECKO_IDS[s] }))
    .filter((x): x is { symbol: string; id: string } => Boolean(x.id));
  if (!entries.length) return {};

  const ids = entries.map((e) => e.id).join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { headers: { Accept: "application/json" }, next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

  const json = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
  const out: Record<string, number> = {};
  for (const { symbol, id } of entries) {
    const price = json[id]?.usd;
    if (price && Number.isFinite(price) && price > 0) out[symbol] = price;
  }
  return out;
}

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const now = Date.now();
  const cached = g.__wispDexMarketsCache as { atMs: number; body: unknown } | undefined;
  if (cached && now - cached.atMs < 30_000) {
    return NextResponse.json(cached.body, { status: 200 });
  }

  const symbols = SOLANA_POPULAR_BASES.map((s) => s.toUpperCase());

  // Fetch prices from Pyth + CoinGecko in parallel — zero GeckoTerminal calls
  const [pythPrices, cgPrices] = await Promise.allSettled([
    getPythPrices(symbols),
    getCoinGeckoPrices(symbols),
  ]);

  const prices: Record<string, number> = {
    USDC: 1,
    ...(pythPrices.status === "fulfilled" ? pythPrices.value : {}),
    ...(cgPrices.status === "fulfilled" ? cgPrices.value : {}),
  };

  const tickers = symbols
    .map((symbol) => {
      const data = SOLANA_TOKEN_DATA[symbol];
      if (!data) return null;
      const price = prices[symbol] ?? 0;
      return {
        symbol,
        name: data.name,
        mint: data.address,
        poolId: "",
        lastPrice: String(price),
        priceChangePercent: "0",
        highPrice: "0",
        lowPrice: "0",
        volume: "0",
        quoteVolume: "0",
      };
    })
    .filter(Boolean);

  const body = { tickers };
  g.__wispDexMarketsCache = { atMs: now, body };
  return NextResponse.json(body, { status: 200 });
}
