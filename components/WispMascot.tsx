"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";

export type WispMood =
  | "idle"
  | "happy"
  | "thinking"
  | "mischief"
  | "excited"
  | "rich"
  | "sleep"
  | "dead";

interface WispMascotProps {
  mood?: WispMood;
  size?: number;
  className?: string;
  interactive?: boolean;
  quote?: string;
}

// Wisp is ALWAYS purple — only the glow color shifts
const moodGlow: Record<WispMood, string> = {
  idle:     "#7c3aed",
  happy:    "#00ffa3",
  thinking: "#7c3aed",
  mischief: "#7c3aed",
  excited:  "#00ffa3",
  rich:     "#00ffa3",
  sleep:    "#4c1d95",
  dead:     "#7c3aed",
};

const eyeShapes: Record<WispMood, { l: string; r: string }> = {
  idle:     { l: "M 34 44 Q 38 40 42 44", r: "M 54 44 Q 58 40 62 44" },
  happy:    { l: "M 33 44 Q 38 37 43 44", r: "M 53 44 Q 58 37 63 44" },
  thinking: { l: "M 34 45 L 42 45",       r: "M 54 43 Q 58 40 62 44" },
  mischief: { l: "M 33 45 Q 38 40 43 45", r: "M 53 44 L 63 42" },
  excited:  { l: "M 33 43 Q 38 36 43 43", r: "M 53 43 Q 58 36 63 43" },
  rich:     { l: "M 34 44 Q 38 40 42 44", r: "M 54 44 Q 58 40 62 44" }, // $ drawn separately
  sleep:    { l: "M 33 44 L 43 44",       r: "M 53 44 L 63 44" },
  dead:     { l: "M 33 42 L 43 48 M 43 42 L 33 48", r: "M 53 42 L 63 48 M 63 42 L 53 48" },
};

const mouthShapes: Record<WispMood, string> = {
  idle:     "M 41 55 Q 48 59 55 55",
  happy:    "M 39 54 Q 48 63 57 54",
  thinking: "M 42 57 Q 48 55 54 57",
  mischief: "M 40 54 Q 44 62 48 54 Q 52 62 56 54",
  excited:  "M 39 53 Q 48 64 57 53",
  rich:     "M 38 54 Q 48 65 58 54",
  sleep:    "M 43 57 L 53 57",
  dead:     "M 41 58 Q 48 54 55 58",
};

function SpeechBubble({ text }: { text: string }) {
  return (
    <motion.div
      className="absolute z-30 whitespace-nowrap"
      style={{ bottom: "88%", left: "50%", x: "-50%" }}
      initial={{ opacity: 0, y: 6, scale: 0.85 }}
      animate={{
        opacity: [0, 1, 1, 1, 0],
        y:       [6, 0, 0, 0, -6],
        scale:   [0.85, 1, 1, 1, 0.9],
      }}
      transition={{
        duration: 3.5,
        delay: 1.2,
        repeat: Infinity,
        repeatDelay: 6,
        times: [0, 0.12, 0.5, 0.85, 1],
      }}
    >
      <div
        className="text-[11px] font-medium text-slate-200 px-3 py-1.5 rounded-xl"
        style={{
          background: "rgba(20,14,40,0.95)",
          border: "1px solid rgba(167,139,250,0.35)",
          boxShadow: "0 4px 20px rgba(124,58,237,0.2)",
        }}
      >
        {text}
      </div>
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2">
        <div
          className="w-0 h-0"
          style={{
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid rgba(167,139,250,0.35)",
          }}
        />
      </div>
    </motion.div>
  );
}

export default function WispMascot({
  mood = "idle",
  size = 120,
  className = "",
  interactive = false,
  quote,
}: WispMascotProps) {
  const [currentMood, setCurrentMood] = useState<WispMood>(mood);
  const controls = useAnimation();
  const glow = moodGlow[currentMood];
  const primary = "#a78bfa";
  const secondary = "#7c3aed";

  useEffect(() => { setCurrentMood(mood); }, [mood]);

  const handleClick = () => {
    if (!interactive) return;
    const moods: WispMood[] = ["idle", "happy", "thinking", "mischief", "excited", "rich", "sleep", "dead"];
    const next = moods[(moods.indexOf(currentMood) + 1) % moods.length];
    setCurrentMood(next);
    controls.start({ rotate: [0, -12, 12, -6, 6, 0], transition: { duration: 0.45 } });
  };

  const isSleeping = currentMood === "sleep";

  return (
    <motion.div
      className={`relative select-none ${interactive ? "cursor-pointer" : ""} ${className}`}
      style={{ width: size, height: size * 1.25 }}
      animate={controls}
      onClick={handleClick}
      whileHover={interactive ? { scale: 1.04 } : {}}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${glow}28 0%, transparent 70%)`,
          width: size * 1.8,
          height: size * 1.8,
          left: -(size * 0.4),
          top: -(size * 0.35),
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: isSleeping ? 5 : 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Pulse ring */}
      {!isSleeping && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            border: `1.5px solid ${glow}44`,
            width: size * 0.9,
            height: size * 0.9,
            left: size * 0.05,
            top: size * 0.05,
          }}
          animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Speech bubble */}
      {quote && <SpeechBubble text={quote} />}

      {/* Zzz for sleep */}
      {isSleeping && (
        <motion.div
          className="absolute font-bold text-violet-400 pointer-events-none select-none"
          style={{ right: -size * 0.1, top: size * 0.05, fontSize: size * 0.18 }}
          animate={{ opacity: [0, 1, 1, 0], y: [0, -10, -20, -30], scale: [0.8, 1, 1.1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
        >
          z
        </motion.div>
      )}
      {isSleeping && (
        <motion.div
          className="absolute font-bold text-violet-300 pointer-events-none select-none"
          style={{ right: size * 0.05, top: -size * 0.05, fontSize: size * 0.22 }}
          animate={{ opacity: [0, 1, 1, 0], y: [0, -12, -24, -36], scale: [0.8, 1, 1.1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
        >
          Z
        </motion.div>
      )}

      {/* SVG Body */}
      <motion.svg
        viewBox="0 0 96 120"
        width={size}
        height={size * 1.25}
        style={{ filter: `drop-shadow(0 0 ${size * 0.12}px ${glow}99)` }}
        animate={{ y: isSleeping ? [0, -3, 0] : [0, -7, 0] }}
        transition={{
          duration: isSleeping ? 5 : 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <defs>
          <radialGradient id={`bg-${currentMood}`} cx="50%" cy="38%" r="62%">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </radialGradient>
          <radialGradient id={`ig-${currentMood}`} cx="42%" cy="30%" r="55%">
            <stop offset="0%" stopColor="white" stopOpacity="0.28" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Tail */}
        <motion.path
          d="M 38 85 Q 28 103 35 113 Q 39 120 44 113 Q 46 106 42 97"
          fill={`${secondary}80`}
          animate={{ d: [
            "M 38 85 Q 28 103 35 113 Q 39 120 44 113 Q 46 106 42 97",
            "M 38 85 Q 26 105 33 115 Q 37 122 42 115 Q 44 108 40 99",
            "M 38 85 Q 28 103 35 113 Q 39 120 44 113 Q 46 106 42 97",
          ]}}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M 58 85 Q 68 103 61 113 Q 57 120 52 113 Q 50 106 54 97"
          fill={`${secondary}80`}
          animate={{ d: [
            "M 58 85 Q 68 103 61 113 Q 57 120 52 113 Q 50 106 54 97",
            "M 58 85 Q 70 105 63 115 Q 59 122 54 115 Q 52 108 56 99",
            "M 58 85 Q 68 103 61 113 Q 57 120 52 113 Q 50 106 54 97",
          ]}}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        <motion.path
          d="M 48 88 Q 48 105 45 115 Q 44 121 48 119 Q 52 121 51 115 Q 48 105 48 88"
          fill={`${primary}55`}
          animate={{ d: [
            "M 48 88 Q 48 105 45 115 Q 44 121 48 119 Q 52 121 51 115 Q 48 105 48 88",
            "M 48 88 Q 50 107 47 117 Q 46 123 48 121 Q 50 123 49 117 Q 46 107 48 88",
            "M 48 88 Q 48 105 45 115 Q 44 121 48 119 Q 52 121 51 115 Q 48 105 48 88",
          ]}}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
        />

        {/* Body */}
        <ellipse cx="48" cy="47" rx="38" ry="41" fill={`url(#bg-${currentMood})`} />
        <ellipse cx="48" cy="41" rx="27" ry="29" fill={`url(#ig-${currentMood})`} />
        <ellipse cx="37" cy="31" rx="7" ry="5" fill="white" opacity="0.22" />

        {/* Eyes */}
        {currentMood === "rich" ? (
          <>
            <text x="31" y="49" fontSize="13" fill="white" fontWeight="900" opacity="0.95">$</text>
            <text x="51" y="49" fontSize="13" fill="white" fontWeight="900" opacity="0.95">$</text>
          </>
        ) : (
          <>
            <motion.path
              d={eyeShapes[currentMood].l}
              stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"
              animate={{ d: eyeShapes[currentMood].l }}
              transition={{ duration: 0.3 }}
            />
            <motion.path
              d={eyeShapes[currentMood].r}
              stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"
              animate={{ d: eyeShapes[currentMood].r }}
              transition={{ duration: 0.3 }}
            />
          </>
        )}

        {/* Eye shine dots */}
        {currentMood !== "sleep" && currentMood !== "dead" && currentMood !== "rich" && (
          <>
            <circle cx="38.5" cy="46" r="2" fill="white" opacity="0.85" />
            <circle cx="58.5" cy="46" r="2" fill="white" opacity="0.85" />
          </>
        )}

        {/* Blink */}
        {currentMood !== "sleep" && currentMood !== "dead" && (
          <>
            <motion.rect x="31" y="39" width="14" height="11" rx="5.5"
              fill={`url(#bg-${currentMood})`}
              animate={{ scaleY: [0,0,0,0,0,0,0,0,0,0,1,0] }}
              transition={{ duration: 5, repeat: Infinity, times: [0,.09,.18,.27,.36,.45,.54,.63,.72,.81,.9,1] }}
            />
            <motion.rect x="51" y="39" width="14" height="11" rx="5.5"
              fill={`url(#bg-${currentMood})`}
              animate={{ scaleY: [0,0,0,0,0,0,0,0,0,0,1,0] }}
              transition={{ duration: 5, repeat: Infinity, times: [0,.09,.18,.27,.36,.45,.54,.63,.72,.81,.9,1] }}
            />
          </>
        )}

        {/* Mouth */}
        <motion.path
          d={mouthShapes[currentMood]}
          stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
          animate={{ d: mouthShapes[currentMood] }}
          transition={{ duration: 0.3 }}
        />

        {/* Blush */}
        {(currentMood === "happy" || currentMood === "excited" || currentMood === "rich") && (
          <>
            <ellipse cx="29" cy="56" rx="7" ry="4" fill="#c4b5fd" opacity="0.35" />
            <ellipse cx="67" cy="56" rx="7" ry="4" fill="#c4b5fd" opacity="0.35" />
          </>
        )}

        {/* Thinking dots */}
        {currentMood === "thinking" && (
          <motion.g animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}>
            <circle cx="73" cy="26" r="2.5" fill="white" opacity="0.55" />
            <circle cx="79" cy="18" r="3.5" fill="white" opacity="0.55" />
            <circle cx="86" cy="11" r="4.5" fill="white" opacity="0.55" />
          </motion.g>
        )}

        {/* Mischief raised eyebrow */}
        {currentMood === "mischief" && (
          <motion.path d="M 53 38 Q 58 34 63 37" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"
            animate={{ rotate: [0, 3, 0] }} transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}

        {/* Rich sparkle */}
        {currentMood === "rich" && (
          <motion.g animate={{ opacity: [0.6, 1, 0.6], rotate: [0, 15, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
            <text x="68" y="24" fontSize="9" fill="#c4b5fd">✦</text>
          </motion.g>
        )}
      </motion.svg>

      {/* Floating particles — only when not sleeping */}
      {!isSleeping && [0,1,2,3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 3 + (i % 2) * 2,
            height: 3 + (i % 2) * 2,
            background: glow,
            left: `${12 + i * 22}%`,
            top: `${25 + (i % 2) * 25}%`,
            filter: "blur(1px)",
          }}
          animate={{ y: [0, -18 - i * 4, 0], opacity: [0, 0.7, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.7, ease: "easeInOut" }}
        />
      ))}
    </motion.div>
  );
}
