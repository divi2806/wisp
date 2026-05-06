import Sidebar from "@/components/dashboard/Sidebar";
import OnboardingModal from "@/components/dashboard/OnboardingModal";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080b14] text-slate-200 flex">
      <Sidebar />
      <main
        className="flex-1 min-h-screen overflow-y-auto"
        style={{ marginLeft: 252 }}
      >
        {children}
      </main>
      <OnboardingModal />
    </div>
  );
}
