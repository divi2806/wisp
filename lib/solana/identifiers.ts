const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ADDRESS_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
const SOL_DOMAIN_RE = /\b[a-z0-9][a-z0-9-_]{0,62}\.sol\b/gi;

export function isLikelySolanaAddress(value: string | undefined | null) {
  return Boolean(value && BASE58_RE.test(value.trim()));
}

export function extractSolanaAddresses(message: string, max = 4) {
  const matches = message.match(ADDRESS_RE) ?? [];
  return [...new Set(matches.filter(isLikelySolanaAddress))].slice(0, max);
}

export function extractSolDomains(message: string, max = 4) {
  const matches = message.match(SOL_DOMAIN_RE) ?? [];
  return [...new Set(matches.map((value) => value.toLowerCase()))].slice(0, max);
}

export function shortAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
