import Sidebar from "@/components/dashboard/Sidebar";
import OnboardingModal from "@/components/dashboard/OnboardingModal";
import ConnectWalletButton from "@/components/wallet/ConnectWalletButton";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--dash-bg)] text-[var(--dash-text)]">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div
        className="fixed right-5 top-0 z-[95] flex h-[70px] items-center pb-3"
        data-tour-id="wallet-connect"
      >
        <ConnectWalletButton variant="panel" />
      </div>
      <main
        data-tour-id="workspace"
        className="h-screen min-h-0 flex-1 overflow-hidden lg:ml-[252px]"
      >
        {children}
      </main>
      <OnboardingModal />
    </div>
  );
}
