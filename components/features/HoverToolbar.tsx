"use client";

import { Link2 } from "lucide-react";
import { cn } from "@/lib/cn";

type HoverToolbarProps = {
  variant: "vertical-right" | "horizontal-below";
  onOpenLink?: () => void;
  className?: string;
};

export function HoverToolbar({ variant, onOpenLink, className }: HoverToolbarProps) {
  return (
    <div
      className={cn(
        "tc-hover-toolbar flex",
        variant === "vertical-right" && "flex-col gap-2",
        variant === "horizontal-below" && "flex-row gap-2",
        className,
      )}
    >
      <button
        aria-label="Open link"
        onClick={onOpenLink}
        className={cn(
          "tc-hover-toolbar__button inline-flex items-center justify-center rounded-full shrink-0",
          "h-6 w-6",
          "bg-surface-raised text-text-secondary border border-border-subtle",
          "hover:bg-surface-subtle hover:text-text-primary",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        )}
      >
        <Link2 size={11} />
      </button>
    </div>
  );
}
