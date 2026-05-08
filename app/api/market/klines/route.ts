import { NextRequest, NextResponse } from "next/server";
import { fetchBinanceKlines, type MarketMode } from "@/lib/market/binance";

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

function parseMode(req: NextRequest): MarketMode {
  const mode = (new URL(req.url).searchParams.get("mode") ?? "spot").toLowerCase();
  return mode === "perps" ? "perps" : "spot";
}

// ── Bybit ──────────────────────────────────────────────────
function toBybitInterval(interval: string): string {
  const map: Record<string, string> = {
    "1m": "1", "3m": "3", "5m": "5", "15m": "15", "30m": "30",
    "1h": "60", "2h": "120", "4h": "240", "6h": "360", "12h": "720",
    "1d": "D", "1w": "W",
  };
  return map[interval] ?? "1";
}

async function fetchBybit(symbol: string, interval: string, limit: number): Promise<Candle[]> {
  const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${encodeURIComponent(symbol)}&interval=${toBybitInterval(interval)}&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 2 } });
  if (!res.ok) throw new Error(`Bybit ${res.status}`);
  const json = (await res.json()) as { result?: { list?: string[][] }; retCode?: number };
  if (json.retCode !== 0 || !json.result?.list) throw new Error("Bybit: no data");
  return json.result.list.reverse().map((k) => ({
    time: Math.floor(Number(k[0]) / 1000),
    open: Number(k[1]), high: Number(k[2]), low: Number(k[3]),
    close: Number(k[4]), volume: Number(k[5]),
  }));
}

// ── OKX ───────────────────────────────────────────────────
function toOkxSymbol(symbol: string): string {
  // BTCUSDT → BTC-USDT, SOLUSDT → SOL-USDT
  if (symbol.endsWith("USDT")) return symbol.slice(0, -4) + "-USDT";
  if (symbol.endsWith("USD"))  return symbol.slice(0, -3) + "-USD";
  return symbol;
}

async function fetchOkx(symbol: string, interval: string, limit: number): Promise<Candle[]> {
  const instId = toOkxSymbol(symbol);
  const url = `https://www.okx.com/api/v5/market/candles?instId=${encodeURIComponent(instId)}&bar=${interval}&limit=${Math.min(limit, 300)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 2 } });
  if (!res.ok) throw new Error(`OKX ${res.status}`);
  const json = (await res.json()) as { code: string; data?: string[][] };
  if (json.code !== "0" || !json.data?.length) throw new Error("OKX: no data");
  // OKX returns newest-first: [ts, open, high, low, close, vol, ...]
  return json.data.reverse().map((k) => ({
    time: Math.floor(Number(k[0]) / 1000),
    open: Number(k[1]), high: Number(k[2]), low: Number(k[3]),
    close: Number(k[4]), volume: Number(k[5]),
  }));
}

// ── Kraken ────────────────────────────────────────────────
function toKrakenPair(symbol: string): string {
  const map: Record<string, string> = {
    BTCUSDT: "XBTUSD", BTCUSD: "XBTUSD",
    SOLUSDT: "SOLUSD", SOLUSD: "SOLUSD",
    ETHUSDT: "ETHUSD", ETHUSD: "ETHUSD",
  };
  return map[symbol] ?? symbol;
}

function toKrakenInterval(interval: string): number {
  const map: Record<string, number> = {
    "1m": 1, "5m": 5, "15m": 15, "30m": 30,
    "1h": 60, "4h": 240, "1d": 1440,
  };
  return map[interval] ?? 1;
}

async function fetchKraken(symbol: string, interval: string): Promise<Candle[]> {
  const pair = toKrakenPair(symbol);
  const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${toKrakenInterval(interval)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 2 } });
  if (!res.ok) throw new Error(`Kraken ${res.status}`);
  const json = (await res.json()) as { error: string[]; result?: Record<string, number[][]> };
  if (json.error?.length) throw new Error(`Kraken: ${json.error[0]}`);
  const rows = Object.values(json.result ?? {}).find((v) => Array.isArray(v)) as number[][] | undefined;
  if (!rows?.length) throw new Error("Kraken: no rows");
  // Kraken: [time, open, high, low, close, vwap, volume, count] — already oldest-first
  return rows.map((k) => ({
    time: Number(k[0]),
    open: Number(k[1]), high: Number(k[2]), low: Number(k[3]),
    close: Number(k[4]), volume: Number(k[6]),
  }));
}

// ── Route ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbol   = (url.searchParams.get("symbol")   ?? "").toUpperCase();
  const interval = (url.searchParams.get("interval") ?? "15m").toLowerCase();
  const limit    = Number(url.searchParams.get("limit") ?? "500");
  const safeLimit = Number.isFinite(limit) ? limit : 500;

  if (!symbol) return NextResponse.json({ error: "Missing symbol." }, { status: 400 });

  const providers = [
    { name: "binance", fn: async () => {
      const mode = parseMode(req);
      const raw = await fetchBinanceKlines({ mode, symbol, interval, limit: safeLimit });
      return raw.map((k) => ({
        time: Math.floor(k[0] / 1000),
        open: Number(k[1]), high: Number(k[2]), low: Number(k[3]),
        close: Number(k[4]), volume: Number(k[5]),
      }));
    }},
    { name: "bybit",   fn: () => fetchBybit(symbol, interval, safeLimit) },
    { name: "okx",     fn: () => fetchOkx(symbol, interval, safeLimit)   },
    { name: "kraken",  fn: () => fetchKraken(symbol, interval)            },
  ];

  for (const { name, fn } of providers) {
    try {
      const candles = await fn();
      if (candles.length > 0) {
        return NextResponse.json({ source: name, symbol, interval, candles }, { status: 200 });
      }
    } catch (err) {
      console.warn(`[klines] ${name} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ error: "All data sources unavailable." }, { status: 500 });
}
