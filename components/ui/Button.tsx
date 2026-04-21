"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "pill";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", children, ...props }, ref) => {
    const base =
      "relative inline-flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer select-none overflow-hidden transition-colors duration-200";

    const variants: Record<Variant, string> = {
      primary:
        "px-6 py-3 rounded-xl text-white bg-[#5b21b6] border border-[rgba(167,139,250,0.35)]",
      secondary:
        "px-6 py-3 rounded-xl text-zinc-400 bg-white/[0.04] border border-white/[0.08]",
      ghost: "px-4 py-2 rounded-lg text-zinc-500",
      pill:
        "px-4 py-2 rounded-full text-white bg-[#5b21b6] border border-[rgba(167,139,250,0.35)]",
    };

    const hovers: Record<Variant, object> = {
      primary: {
        boxShadow: "0 0 28px rgba(109,40,217,0.55), 0 0 0 1px rgba(167,139,250,0.5)",
        borderColor: "rgba(167,139,250,0.55)",
      },
      secondary: {
        background: "rgba(255,255,255,0.07)",
        borderColor: "rgba(255,255,255,0.14)",
        color: "#ffffff",
      },
      ghost: { color: "#e4e4e7" },
      pill: {
        boxShadow: "0 0 20px rgba(109,40,217,0.45), 0 0 0 1px rgba(167,139,250,0.45)",
      },
    };

    return (
      <motion.button
        ref={ref}
        className={cn(base, variants[variant], className)}
        whileHover={{ scale: 1.03, ...hovers[variant] }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15 }}
        {...props}
      >
        {/* Sweep shimmer — primary and pill only */}
        {(variant === "primary" || variant === "pill") && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.13) 50%, transparent 60%)",
              backgroundSize: "200% 100%",
              animation: "btn-sweep 3.5s ease-in-out infinite 0.8s",
            }}
          />
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
