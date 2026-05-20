"use client";

import { Grip, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/cn";

export type View = "canvas" | "grid";

type ViewTogglePillProps = {
  value: View;
  onChange: (view: View) => void;
  className?: string;
};

export function ViewTogglePill({ value, onChange, className }: ViewTogglePillProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") onChange("canvas");
    if (e.key === "ArrowRight") onChange("grid");
  }

  return (
    <div
      role="group"
      aria-label="View toggle"
      onKeyDown={handleKeyDown}
      className={cn(
        "tc-view-toggle tc-view-toggle__pill inline-flex items-center gap-[5px] rounded-full bg-surface-tab-pill p-[7px]",
        className,
      )}
    >
      <button
        onClick={() => onChange("canvas")}
        aria-label="Canvas view"
        aria-pressed={value === "canvas"}
        className={cn(
          "tc-view-toggle__option inline-flex items-center gap-[10px] rounded-full px-4 py-[10px]",
          "font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)]",
          "transition-colors duration-[var(--motion-duration-small)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          value === "canvas"
            ? "bg-surface-tab-active text-text-primary"
            : "text-text-secondary hover:text-text-primary",
        )}
      >
        <Grip size={16} aria-hidden />
        Canvas
      </button>

      <button
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        aria-pressed={value === "grid"}
        className={cn(
          "tc-view-toggle__option inline-flex items-center gap-[5px] rounded-full px-4 py-[10px]",
          "font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)]",
          "transition-colors duration-[var(--motion-duration-small)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          value === "grid"
            ? "bg-surface-tab-active text-text-primary"
            : "text-text-secondary hover:text-text-primary",
        )}
      >
        <LayoutDashboard size={16} aria-hidden />
        Grid
      </button>
    </div>
  );
}
