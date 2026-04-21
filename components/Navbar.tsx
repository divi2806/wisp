"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import WispMascot from "./WispMascot";
import { Button } from "./ui/Button";

export default function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  return (
    <motion.nav className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <motion.div
        className="max-w-5xl mx-auto rounded-2xl px-5 py-3 flex items-center justify-between"
        animate={{
          background: scrolled ? "rgba(8,11,20,0.92)" : "rgba(8,11,20,0.45)",
          borderColor: scrolled ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
          boxShadow: scrolled
            ? "0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.5)"
            : "none",
        }}
        style={{
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Logo */}
        <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.02 }}>
          <WispMascot size={28} mood="idle" className="scale-[1.3] -translate-y-0.5" />
          <span className="font-extrabold tracking-tight" style={{ fontSize: 16, color: "#e4e4e7" }}>
            Wisp
          </span>
        </motion.div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-7">
          {["Features", "How it works", "Protocols"].map((item) => (
            <motion.a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              style={{ fontSize: 13, color: "#71717a" }}
              whileHover={{ color: "#e4e4e7", y: -1 }}
              transition={{ duration: 0.15 }}
            >
              {item}
            </motion.a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <motion.button
            style={{ fontSize: 13, color: "#52525b" }}
            className="hidden md:block"
            whileHover={{ color: "#a1a1aa" }}
          >
            Sign in
          </motion.button>
          <Button
            variant="pill"
            className="text-xs font-semibold px-4 py-2"
            onClick={() =>
              document.getElementById("early-access")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Early access
          </Button>
        </div>
      </motion.div>
    </motion.nav>
  );
}
