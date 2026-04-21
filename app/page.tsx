import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import PortfolioPreview from "@/components/PortfolioPreview";
import Protocols from "@/components/Protocols";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080b14] text-slate-200 overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <PortfolioPreview />
      <HowItWorks />
      <Protocols />
      <CTA />
      <Footer />
    </main>
  );
}
