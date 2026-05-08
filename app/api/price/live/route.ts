import { NextRequest, NextResponse } from "next/server";

// Pyth Network price feed IDs (Hermes REST API — free, no key, real-time)
const PYTH_IDS: Record<string, string> = {
  SOL:      "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  BTC:      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH:      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  JUP:      "0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996",
  JTO:      "0xb43660a5f790c69354b0729a5ef9d50d68f1df92107540210b9cccba1f947cc2",
  PYTH:     "0x0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff",
  BONK:     "0x72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419",
  WIF:      "0x4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc",
  RAY:      "0x91568baa8beb53db23eb3fb7f22c6e8bd303d103919e19733f2bb642d3e7987a",
  DRIFT:    "0x5c1690b27bb02446db17cdda13ccc2c1d609ad6d2ef5bf4983a85ea8b6f19d07",
  HNT:      "0x649fdd7ec08e8e2a20f425729854e90293dcbe2376abc47197a14da6ff339756",
  KMNO:     "0xb17e5bc5de742a8a378b54c9c75442b7d51e30ada63f28d9bd28d3c0e26511a0",
  ORCA:     "0x37505261e557e251290b8c8899453064e8d760ed5c65a779726f2490980da74c",
  POPCAT:   "0xb9312a7ee50e189ef045aa3c7842e099b061bd9bdc99ac645956c3b660dc8cce",
};

// CoinGecko IDs for tokens without Pyth feeds
const COINGECKO_IDS: Record<string, string> = {
  PENGU:    "pudgy-penguins",
  FARTCOIN: "fartcoin",
  AI16Z:    "ai16z",
  GOAT:     "goatseus-maximus",
  JLP:      "jupiter-perpetuals-liquidity-provider-token",
  BOME:     "book-of-meme",
  CHILLGUY: "chill-guy",
  MEW:      "cat-in-a-dogs-world",
  MICHI:    "michi",
  MOBILE:   "helium-mobile",
  MYRO:     "myro",
  MNDE:     "marinade",
  PNUT:     "peanut-the-squirrel",
  SAMO:     "samoyedcoin",
  SLERF:    "slerf",
  SLND:     "solend",
  TNSR:     "tensor",
  STEP:     "step-finance",
  NOS:      "nosana",
  RNDR:     "render-token",
  WEN:      "wen-4",
  ZEUS:     "zeus-network",
};

type PythParsed = {
  id: string;
  price: { price: string; expo: number };
};

type PythEntry = { symbol: string; id: string };

function pythId(id: string) {
  return id.replace(/^0x/, "");
}

function priceFromPyth(item: PythParsed) {
  const price = Number(item.price.price) * Math.pow(10, item.price.expo);
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function fetchPythBatch(entries: PythEntry[]): Promise<Record<string, number>> {
  const params = entries.map((e) => `ids[]=${pythId(e.id)}`).join("&");
  const res = await fetch(
    `https://hermes.pyth.network/v2/updates/price/latest?${params}`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Pyth failed (${res.status})`);

  const json = (await res.json()) as { parsed?: PythParsed[] };
  const prices: Record<string, number> = {};

  for (const item of json.parsed ?? []) {
    const entry = entries.find((e) => pythId(e.id) === pythId(item.id));
    if (!entry) continue;
    const price = priceFromPyth(item);
    if (price !== null) prices[entry.symbol] = price;
  }

  return prices;
}

async function fetchPythPrices(symbols: string[]): Promise<Record<string, number>> {
  const entries = symbols
    .map((s) => ({ symbol: s, id: PYTH_IDS[s] }))
    .filter((x): x is { symbol: string; id: string } => Boolean(x.id));

  if (!entries.length) return {};

  try {
    return await fetchPythBatch(entries);
  } catch (batchErr) {
    const settled = await Promise.allSettled(entries.map((entry) => fetchPythBatch([entry])));
    const prices: Record<string, number> = {};
    const failed: string[] = [];

    for (let i = 0; i < settled.length; i += 1) {
      const result = settled[i];
      if (result.status === "fulfilled") {
        Object.assign(prices, result.value);
      } else {
        failed.push(entries[i].symbol);
      }
    }

    if (failed.length) {
      console.warn("[price/live] Pyth skipped feeds:", failed.join(","), batchErr instanceof Error ? batchErr.message : batchErr);
    }

    return prices;
  }
}

async function fetchCoinGeckoPrices(symbols: string[]): Promise<Record<string, number>> {
  const entries = symbols
    .map((s) => ({ symbol: s, id: COINGECKO_IDS[s] }))
    .filter((x): x is { symbol: string; id: string } => Boolean(x.id));

  if (!entries.length) return {};

  const ids = entries.map((e) => e.id).join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { headers: { Accept: "application/json" }, next: { revalidate: 30 } }
  );
  if (!res.ok) throw new Error(`CoinGecko failed (${res.status})`);

  const json = (await res.json()) as Record<string, { usd?: number }>;
  const prices: Record<string, number> = {};

  for (const { symbol, id } of entries) {
    const price = json[id]?.usd;
    if (price && Number.isFinite(price) && price > 0) prices[symbol] = price;
  }

  return prices;
}

export async function GET(req: NextRequest) {
  const symbols = (new URL(req.url).searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50);

  if (!symbols.length) return NextResponse.json({ prices: {} });

  const prices: Record<string, number> = symbols.includes("USDC") ? { USDC: 1 } : {};

  // Pyth — real-time oracle for major tokens
  try {
    const pyth = await fetchPythPrices(symbols);
    Object.assign(prices, pyth);
  } catch (err) {
    console.warn("[price/live] Pyth failed:", err instanceof Error ? err.message : err);
  }

  // CoinGecko — fallback for tokens not on Pyth
  const missing = symbols.filter((s) => !prices[s] && COINGECKO_IDS[s]);
  if (missing.length) {
    try {
      const cg = await fetchCoinGeckoPrices(missing);
      Object.assign(prices, cg);
    } catch (err) {
      console.warn("[price/live] CoinGecko failed:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ prices });
}
