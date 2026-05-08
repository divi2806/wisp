import Sidebar from "@/components/dashboard/Sidebar";
import OnboardingModal from "@/components/dashboard/OnboardingModal";
import ConnectWalletButton from "@/components/wallet/ConnectWalletButton";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-[#080b14] text-slate-200 flex">
      <Sidebar />
      <div
        className="fixed right-5 top-0 h-[70px] flex items-center pb-3 z-[95]"
        data-tour-id="wallet-connect"
      >
        <ConnectWalletButton variant="panel" />
      </div>
      <main
        data-tour-id="workspace"
        className="flex-1 h-screen min-h-0 overflow-hidden"
        style={{ marginLeft: 252 }}
      >
        {children}
      </main>
      <OnboardingModal />
    </div>
  );
}
