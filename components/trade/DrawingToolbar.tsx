"use client";

import { motion } from "framer-motion";
import { MousePointer2, Minus, TrendingUp, GitMerge, Trash2 } from "lucide-react";

export type DrawingTool = "cursor" | "hline" | "trendline" | "fib" | "eraser";

const TOOLS: { id: DrawingTool; Icon: React.FC<{ size: number; strokeWidth: number }>; label: string }[] = [
  { id: "cursor",    Icon: MousePointer2, label: "Cursor" },
  { id: "hline",     Icon: Minus,         label: "Horizontal line" },
  { id: "trendline", Icon: TrendingUp,    label: "Trend line" },
  { id: "fib",       Icon: GitMerge,      label: "Fibonacci retracement" },
];

export function DrawingToolbar({
  activeTool,
  onToolChange,
  pendingStep,
}: {
  activeTool: DrawingTool;
  onToolChange: (t: DrawingTool) => void;
  pendingStep?: number; // 1 = first point placed, waiting for second
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 py-3 flex-shrink-0"
      style={{ width: 44, borderRight: "1px solid rgba(255,255,255,0.05)" }}
    >
      {TOOLS.map(({ id, Icon, label }) => {
        const active = activeTool === id;
        return (
          <motion.button
            key={id}
            onClick={() => onToolChange(id)}
            title={label}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              background: active ? "rgba(167,139,250,0.18)" : "rgba(0,0,0,0)",
              color: active ? "#a78bfa" : "#3f3f46",
            }}
            whileHover={{ background: active ? "rgba(167,139,250,0.22)" : "rgba(255,255,255,0.05)", color: active ? "#a78bfa" : "#71717a" }}
            whileTap={{ scale: 0.92 }}
          >
            <Icon size={14} strokeWidth={active ? 2 : 1.6} />
            {/* Step indicator dot for tools that need 2 clicks */}
            {active && pendingStep === 1 && (
              <motion.span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: "#a78bfa" }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </motion.button>
        );
      })}

      {/* Divider */}
      <div className="w-5 my-1" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      {/* Clear all */}
      <motion.button
        onClick={() => onToolChange("eraser")}
        title="Clear all drawings"
        className="flex items-center justify-center w-8 h-8 rounded-lg"
        style={{ color: "#3f3f46", background: "rgba(0,0,0,0)" }}
        whileHover={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}
        whileTap={{ scale: 0.92 }}
      >
        <Trash2 size={13} strokeWidth={1.6} />
      </motion.button>
    </div>
  );
}
