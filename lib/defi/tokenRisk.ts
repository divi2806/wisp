import { fetchBirdeyeTokenRisk, type BirdeyeTokenRisk } from "@/lib/market/birdeye";
import { SOLANA_TOKEN_DATA } from "@/lib/market/solanaTokenData";
import { extractSolanaAddresses } from "@/lib/solana/identifiers";

export type TokenRiskContext = {
  requested: string | null;
  risk: BirdeyeTokenRisk | null;
  warnings: string[];
};

const TOKEN_RISK_RE = /\b(buy|ape|entry|risk|risky|safe|rug|rugged|security|holders?|liquidity|freeze|mint authority|good|bad|avoid|score|analy[sz]e)\b/i;

function detectSymbol(message: string) {
  const upper = message.toUpperCase();
  const symbols = Object.keys(SOLANA_TOKEN_DATA).sort((a, b) => b.length - a.length);
  for (const symbol of symbols) {
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`).test(upper)) return symbol;
  }
  return null;
}

export function shouldFetchTokenRiskContext(message: string) {
  return TOKEN_RISK_RE.test(message) && (detectSymbol(message) !== null || extractSolanaAddresses(message).length > 0);
}

export async function fetchTokenRiskContext(message: string): Promise<TokenRiskContext | null> {
  const requested = extractSolanaAddresses(message, 1)[0] ?? detectSymbol(message);
  if (!requested) return null;

  try {
    const risk = await fetchBirdeyeTokenRisk(requested);
    return {
      requested,
      risk,
      warnings: risk.warnings,
    };
  } catch (err: unknown) {
    return {
      requested,
      risk: null,
      warnings: [err instanceof Error ? err.message : String(err)],
    };
  }
}
