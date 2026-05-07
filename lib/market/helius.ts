type HeliusRpcResponse<T> = {
  result?: T;
  error?: {
    code?: number;
    message?: string;
  };
};

type HeliusAssetContent = {
  metadata?: {
    name?: string;
    symbol?: string;
  };
};

type HeliusTokenInfo = {
  balance?: number;
  supply?: number;
  decimals?: number;
  token_program?: string;
  price_info?: {
    price_per_token?: number;
    total_price?: number;
    currency?: string;
  };
};

export type HeliusAsset = {
  id?: string;
  interface?: string;
  content?: HeliusAssetContent;
  token_info?: HeliusTokenInfo;
  grouping?: Array<{ group_key?: string; group_value?: string }>;
};

export type HeliusAssetsByOwner = {
  total?: number;
  limit?: number;
  page?: number;
  nativeBalance?: {
    lamports?: number;
    price_per_sol?: number;
    total_price?: number;
  };
  items?: HeliusAsset[];
};

export type SolanaAccountInfo = {
  value?: {
    data?: [string, string] | string;
    executable?: boolean;
    lamports?: number;
    owner?: string;
  } | null;
};

export type ParsedTokenAccount = {
  pubkey?: string;
  account?: {
    data?: {
      parsed?: {
        info?: {
          mint?: string;
          state?: string;
          tokenAmount?: {
            amount?: string;
            decimals?: number;
            uiAmount?: number | null;
            uiAmountString?: string;
          };
        };
      };
    };
  };
};

export type SolanaTokenAccountsByOwner = {
  context?: {
    slot?: number;
  };
  value?: ParsedTokenAccount[];
};

const HELIUS_RPC_BASE = "https://mainnet.helius-rpc.com";
const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

function heliusRpcUrl() {
  const apiKey = process.env.HELIUS_API_KEY?.trim();
  if (!apiKey) return null;
  return `${HELIUS_RPC_BASE}/?api-key=${encodeURIComponent(apiKey)}`;
}

export function getSolanaRpcUrl() {
  const explicitRpc = process.env.SOLANA_RPC_URL?.trim();
  if (explicitRpc) return explicitRpc;

  const heliusUrl = heliusRpcUrl();
  if (!heliusUrl) {
    throw new Error("HELIUS_API_KEY or SOLANA_RPC_URL is not configured on the server.");
  }
  return heliusUrl;
}

async function heliusRpc<T>(method: string, params: unknown): Promise<T> {
  const url = heliusRpcUrl();
  if (!url) {
    throw new Error("HELIUS_API_KEY is not configured on the server.");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "wisp",
      method,
      params,
    }),
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Helius RPC ${method} failed (${res.status})${text ? `: ${text.slice(0, 140)}` : ""}`);
  }

  const json = (await res.json()) as HeliusRpcResponse<T>;
  if (json.error) {
    throw new Error(`Helius RPC ${method} failed: ${json.error.message ?? json.error.code ?? "unknown error"}`);
  }
  if (json.result === undefined) {
    throw new Error(`Helius RPC ${method} returned no result.`);
  }
  return json.result;
}

async function solanaRpc<T>(method: string, params: unknown): Promise<T> {
  const url = getSolanaRpcUrl();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "wisp",
      method,
      params,
    }),
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Solana RPC ${method} failed (${res.status})${text ? `: ${text.slice(0, 140)}` : ""}`);
  }

  const json = (await res.json()) as HeliusRpcResponse<T>;
  if (json.error) {
    throw new Error(`Solana RPC ${method} failed: ${json.error.message ?? json.error.code ?? "unknown error"}`);
  }
  if (json.result === undefined) {
    throw new Error(`Solana RPC ${method} returned no result.`);
  }
  return json.result;
}

export async function fetchSolanaAccountInfo(address: string) {
  return solanaRpc<SolanaAccountInfo>("getAccountInfo", [address, { encoding: "base64" }]);
}

export async function fetchSolanaTokenAccountsByOwner(ownerAddress: string) {
  const fetchProgram = (programId: string) =>
    solanaRpc<SolanaTokenAccountsByOwner>("getTokenAccountsByOwner", [
      ownerAddress,
      { programId },
      { encoding: "jsonParsed" },
    ]);

  const results = await Promise.allSettled([
    fetchProgram(SPL_TOKEN_PROGRAM_ID),
    fetchProgram(TOKEN_2022_PROGRAM_ID),
  ]);

  const accounts: ParsedTokenAccount[] = [];
  const warnings: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      accounts.push(...(result.value.value ?? []));
    } else {
      warnings.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  }

  return { accounts, warnings };
}

export async function fetchHeliusAssetsByOwner(ownerAddress: string) {
  return heliusRpc<HeliusAssetsByOwner>("getAssetsByOwner", {
    ownerAddress,
    page: 1,
    limit: 1000,
    displayOptions: {
      showFungible: true,
      showNativeBalance: true,
      showCollectionMetadata: false,
      showGrandTotal: true,
    },
  });
}

export async function fetchHeliusNativeBalance(ownerAddress: string) {
  const result = await heliusRpc<{ value: number }>("getBalance", [ownerAddress]);
  return result.value;
}
