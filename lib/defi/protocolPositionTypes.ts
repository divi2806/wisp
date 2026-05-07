export type ProtocolHealth = "no-borrow" | "lower-risk" | "watch" | "danger" | "unknown";

export type ProtocolPositionMetric = {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "danger";
};

export type ProtocolPositionLeg = {
  symbol: string;
  valueUsd: number | null;
  apy: number | null;
  amount?: number | null;
};

export type ProtocolPositionSnapshot = {
  label: string;
  positionType: "lend" | "perp" | "spot" | "clmm" | "amm" | "vault" | "unknown";
  suppliedUsd: number | null;
  borrowedUsd: number | null;
  netUsd: number | null;
  health: ProtocolHealth;
  deposits: ProtocolPositionLeg[];
  borrows: ProtocolPositionLeg[];
  metrics: ProtocolPositionMetric[];
};

export type ProtocolProviderResult = {
  protocol: string;
  provider: string;
  positions: ProtocolPositionSnapshot[];
  warnings: string[];
};
