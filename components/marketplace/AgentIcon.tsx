import {
  CandlestickChart,
  Coins,
  Crosshair,
  Droplets,
  FlaskConical,
  Gauge,
  PieChart,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import type { MarketplaceAgent } from "@/lib/marketplace/agents";

const iconMap = {
  candles: CandlestickChart,
  coins: Coins,
  crosshair: Crosshair,
  droplets: Droplets,
  flask: FlaskConical,
  gauge: Gauge,
  pie: PieChart,
  shield: ShieldCheck,
  wallet: WalletCards,
} satisfies Record<MarketplaceAgent["icon"], typeof CandlestickChart>;

export function AgentIcon({
  icon,
  color,
  size = 18,
}: {
  icon: MarketplaceAgent["icon"];
  color: string;
  size?: number;
}) {
  const Icon = iconMap[icon];
  return <Icon size={size} color={color} strokeWidth={1.8} aria-hidden="true" />;
}
