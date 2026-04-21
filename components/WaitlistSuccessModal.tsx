"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import WispMascot from "./WispMascot";

interface Props {
  email: string;
  onClose: () => void;
}

const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 420,
  y: -(Math.random() * 320 + 80),
  rotate: Math.random() * 720 - 360,
  scale: Math.random() * 0.6 + 0.4,
  color: ["#b4a8f0", "#8b5cf6", "#ffffff", "#e0d9ff", "#6d28d9"][
    Math.floor(Math.random() * 5)
  ],
  shape: Math.random() > 0.5 ? "circle" : "rect",
  delay: Math.random() * 0.4,
}));

export default function WaitlistSuccessModal({ email, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-999 flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      >
        {/* Blurred backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background: "rgba(4,5,12,0.82)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
        />

        {/* Modal card */}
        <motion.div
          key="modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.82, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 16 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="relative z-10 w-full max-w-sm text-center overflow-hidden"
          style={{
            background: "rgba(13,16,32,0.95)",
            border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 28,
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.05), 0 40px 100px rgba(0,0,0,0.6), 0 0 80px rgba(91,33,182,0.2)",
            padding: "40px 32px 36px",
          }}
        >
          {/* Glow ring behind wisp */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: 24,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(91,33,182,0.35) 0%, transparent 70%)",
              filter: "blur(24px)",
            }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Confetti burst */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ borderRadius: 28 }}>
            {CONFETTI.map((p) => (
              <motion.div
                key={p.id}
                className="absolute"
                style={{
                  left: "50%",
                  top: "38%",
                  width: p.shape === "circle" ? 7 : 9,
                  height: p.shape === "circle" ? 7 : 5,
                  borderRadius: p.shape === "circle" ? "50%" : 2,
                  background: p.color,
                  opacity: 0,
                }}
                animate={{
                  x: p.x,
                  y: p.y,
                  rotate: p.rotate,
                  scale: [p.scale, p.scale * 0.3],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.4,
                  delay: p.delay,
                  ease: [0.2, 0.8, 0.4, 1],
                }}
              />
            ))}
          </div>

          {/* Wisp mascot */}
          <motion.div
            className="flex justify-center mb-5 relative z-10"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.1 }}
          >
            <WispMascot size={100} mood="excited" quote="ur in fren 🎉" />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <div
              className="font-extrabold mb-2 tracking-[-0.02em]"
              style={{
                fontSize: 26,
                background: "linear-gradient(120deg,#ffffff,#b4a8f0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              You're on the list!
            </div>
          </motion.div>

          <motion.p
            className="text-sm leading-relaxed mb-6"
            style={{ color: "#71717a" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            Wisp is whispering your name.{" "}
            <span style={{ color: "#a1a1aa" }}>
              {email.split("@")[0]}
            </span>
            , you'll be first to know when we go live on Solana.
          </motion.p>

          {/* Close button */}
          <motion.button
            onClick={onClose}
            className="group relative w-full py-3 rounded-2xl font-semibold text-sm overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#52525b",
            }}
            whileHover={{
              borderColor: "rgba(239,68,68,0.25)",
              color: "#f87171",
            }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            {/* Red fill sweep on hover */}
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-2xl"
              initial={{ scaleX: 0, originX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{ background: "rgba(239,68,68,0.07)" }}
            />
            <span className="relative flex items-center justify-center gap-2">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l11 11M12 1L1 12" />
              </svg>
              Close
            </span>
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
