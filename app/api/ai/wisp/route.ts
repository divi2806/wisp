import { NextRequest, NextResponse } from "next/server";

type TradeContext = {
  symbol?: string;
  interval?: string;
  candleType?: string;
  indicators?: Record<string, boolean>;
  livePrice?: number | null;
  recentCandles?: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>;
  indicatorValues?: {
    rsi14?: number | null;
    macd?: { macd: number; signal: number; hist: number } | null;
  };
  lastCandle?: { open: number; high: number; low: number; close: number; changePct?: number | null; rangePct?: number | null } | null;
  paper?: {
    enabled?: boolean;
    cashUSDT?: number;
    position?: number;
    qty?: number;
    avgEntry?: number | null;
    unrealizedPnL?: number | null;
    openOrdersCount?: number;
    fillsCount?: number;
    latestFills?: Array<{ atMs: number; side: "buy" | "sell"; qty: number; price: number; notional: number }>;
    openOrders?: Array<{
      id: string;
      atMs: number;
      side: "buy" | "sell";
      type: "market" | "limit";
      qty: number;
      limitPrice: number | null;
    }>;
  };
};

async function geminiGenerate(args: { prompt: string; apiKey: string }) {
  const { prompt, apiKey } = args;
  // Keep model conservative; update easily later.
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 500,
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}${t ? `: ${t.slice(0, 200)}` : ""}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return text.trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY. Add it to your server env (.env.local) and restart dev server." },
      { status: 500 }
    );
  }

  let body: { message?: string; context?: TradeContext } = {};
  try {
    body = (await req.json()) as { message?: string; context?: TradeContext };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Missing message." }, { status: 400 });

  const ctx = body.context ?? {};
  const teacherMode = /(^|\b)(what is|what's|whats|what does|define|explain|teach me)\b/i.test(message);

  const system = [
    "You are Wisp: a frank, funny, very human Solana DEX trading buddy.",
    "Tone: casual, witty, a bit mischievous, but not cringe. Short paragraphs.",
    "You are inside a paper-trading terminal. Users have no funds; they are learning.",
    "You can use the provided screen context to answer what they are seeing: symbol, timeframe, candle type, enabled indicators, last candle OHLC, recent candles, indicator values (RSI/MACD), paper balance, position stats (qty/avg entry/unrealized PnL), open orders, and latest fills.",
    "Do NOT claim certainty about price direction. No guarantees. Give probabilistic, educational guidance and risk management.",
    "If the user asks 'where will it go', respond with: (1) what the indicators imply, (2) 2-3 scenarios, (3) a simple plan (entries/exits/invalidations), (4) position sizing guidance for paper.",
    "If the user asks about 'my position', summarize: qty, avg entry, mark price, unrealized PnL, any open orders, and the last 1-3 fills (side/qty/price).",
    "If TEACHER_MODE is true, include a short 'Mini lesson (≤60s)' section at the end: definition, why it matters, and a tiny example using the current SCREEN_CONTEXT. Do not add this section otherwise.",
    "If context is missing, ask 1 targeted question.",
    "",
    `TEACHER_MODE: ${teacherMode ? "true" : "false"}`,
    "",
    "SCREEN_CONTEXT(JSON):",
    JSON.stringify(ctx),
    "",
    "USER:",
    message,
  ].join("\n");

  try {
    const text = await geminiGenerate({ prompt: system, apiKey });
    return NextResponse.json({ reply: text }, { status: 200 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: "AI request failed." }, { status: 500 });
  }
}

