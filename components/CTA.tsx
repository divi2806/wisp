"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import WispMascot from "./WispMascot";
import { Button } from "./ui/Button";
import WaitlistSuccessModal from "./WaitlistSuccessModal";

export default function CTA() {
  const [email, setEmail] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [wispMood, setWispMood] = useState<"idle" | "happy" | "excited">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setWispMood("excited");
    setShowModal(true);
  };

  return (
    <>
      <section id="early-access" className="relative py-32 px-6 overflow-hidden">
        {/* Background */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(91,33,182,0.1) 0%, transparent 70%)",
          }}
        />
        <div className="absolute inset-0 grid-bg opacity-20" />

        {/* Glow orbs — lavender only */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-72 h-72 rounded-full bg-violet-600/[0.06] blur-3xl" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-72 h-72 rounded-full bg-violet-500/[0.04] blur-3xl" />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {/* Mascot */}
            <div className="flex justify-center mb-6">
              <WispMascot size={110} mood={wispMood} />
            </div>

            <h2
              className="font-extrabold tracking-[-0.025em] leading-[1.05] mb-4"
              style={{ fontSize: "clamp(28px,4.5vw,52px)", color: "#ffffff" }}
            >
              Let Wisp guide your
              <br />
              <span
                style={{
                  background: "linear-gradient(120deg,#ffffff,#b4a8f0)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                DeFi journey
              </span>
            </h2>
            <p style={{ color: "#71717a", fontSize: 16 }} className="mb-10">
              Join the waitlist. Be first to access AI-powered DeFi intelligence on Solana.
            </p>

            <motion.form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              onFocus={() => setWispMood("happy")}
              onBlur={() => setWispMood("idle")}
            >
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-5 py-3.5 rounded-xl glass text-slate-200 placeholder-slate-600 text-sm outline-none transition-colors"
                style={{ border: "1px solid rgba(139,92,246,0.15)" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.15)")}
              />
              <Button
                type="submit"
                variant="primary"
                className="px-6 py-3.5 rounded-xl font-bold text-sm whitespace-nowrap"
              >
                Join waitlist →
              </Button>
            </motion.form>

            <p className="text-slate-600 text-xs mt-5">No spam. Just early access when we're ready.</p>
          </motion.div>
        </div>
      </section>

      {/* Popup modal — rendered outside section so it overlays everything */}
      <AnimatePresence>
        {showModal && (
          <WaitlistSuccessModal
            email={email}
            onClose={() => {
              setShowModal(false);
              setWispMood("idle");
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
