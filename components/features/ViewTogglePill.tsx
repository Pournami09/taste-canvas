"use client";

import { Grip, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/cn";
import { useRef, useLayoutEffect, useState } from "react";

export type View = "canvas" | "grid";

type ViewTogglePillProps = {
  value: View;
  onChange: (view: View) => void;
  className?: string;
};

export function ViewTogglePill({ value, onChange, className }: ViewTogglePillProps) {
  const pillRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLButtonElement>(null);
  const firstMeasure = useRef(true);
  const [bg, setBg] = useState<{ clipPath: string; animate: boolean }>({ clipPath: "", animate: false });

  useLayoutEffect(() => {
    const pill = pillRef.current;
    const activeBtn = value === "canvas" ? canvasRef.current : gridRef.current;
    if (!pill || !activeBtn) return;

    const pillRect = pill.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const l = Math.round(btnRect.left - pillRect.left);
    const r = Math.round(pillRect.right - btnRect.right);

    setBg({ clipPath: `inset(0 ${r}px 0 ${l}px round 100px)`, animate: !firstMeasure.current });
    firstMeasure.current = false;
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") onChange("canvas");
    if (e.key === "ArrowRight") onChange("grid");
  }

  return (
    <div
      ref={pillRef}
      role="group"
      aria-label="View toggle"
      onKeyDown={handleKeyDown}
      className={cn(
        "tc-view-toggle tc-view-toggle__pill relative inline-flex items-center gap-[5px] rounded-full bg-surface-tab-pill p-[7px]",
        className,
      )}
    >
      {/* Sliding active background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-surface-tab-active block self-center"
        style={{
          clipPath: bg.clipPath || undefined,
          transition: bg.animate ? "clip-path 200ms cubic-bezier(0.77, 0, 0.175, 1)" : "none",
        }}
      />

      <button
        ref={canvasRef}
        onClick={() => onChange("canvas")}
        aria-label="Canvas view"
        aria-pressed={value === "canvas"}
        className={cn(
          "relative z-10 tc-view-toggle__option inline-flex items-center gap-[10px] rounded-full px-4 py-[10px]",
          "font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)]",
          "transition-colors duration-[var(--motion-duration-small)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          value === "canvas" ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
        )}
      >
        <Grip size={16} aria-hidden />
        Canvas
      </button>

      <button
        ref={gridRef}
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        aria-pressed={value === "grid"}
        className={cn(
          "relative z-10 tc-view-toggle__option inline-flex items-center gap-[5px] rounded-full px-4 py-[10px]",
          "font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)]",
          "transition-colors duration-[var(--motion-duration-small)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          value === "grid" ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
        )}
      >
        <LayoutDashboard size={16} aria-hidden />
        Grid
      </button>
    </div>
  );
}
