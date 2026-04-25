"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/cn";
import { getTheme, setTheme, type Theme } from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setLocalTheme] = useState<Theme>("dark");

  useEffect(() => {
    setLocalTheme(getTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setLocalTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md",
        "text-text-secondary hover:text-text-primary hover:bg-surface-raised",
        "transition-colors duration-[var(--motion-duration-small)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        className,
      )}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
