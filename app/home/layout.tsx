import Sidebar from "@/components/dashboard/Sidebar";
import OnboardingModal from "@/components/dashboard/OnboardingModal";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-[#080b14] text-slate-200 flex">
      <Sidebar />
      <main
        className="flex-1 h-screen min-h-0 overflow-hidden"
        style={{ marginLeft: 252 }}
      >
        {children}
      </main>
      <OnboardingModal />
    </div>
  );
}
