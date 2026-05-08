import { PredictionMarketTerminal } from "@/components/prediction/PredictionMarketTerminal";
import WispPageBar from "@/components/WispPageBar";

export default function PredictionMarketPage() {
  return (
    <div className="flex flex-col h-screen">
      <WispPageBar />
      <div className="flex-1 min-h-0">
        <PredictionMarketTerminal />
      </div>
    </div>
  );
}
