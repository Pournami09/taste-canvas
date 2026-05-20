"use client";

import { cn } from "@/lib/cn";

type Chip = {
  label: string;
  url: string;
};

type ProfileBlockProps = {
  name: string;
  role: string;
  chips?: Chip[];
  className?: string;
};

export function ProfileBlock({ name, role, chips = [], className }: ProfileBlockProps) {
  return (
    <div className={cn("tc-profile-block flex flex-col gap-5", className)}>
      <div className="flex flex-col">
        <span
          className="tc-profile-block__name font-sans font-medium text-text-primary capitalize leading-normal"
          style={{ fontSize: "var(--font-size-xl)" }}
        >
          {name}
        </span>
        <span
          className="tc-profile-block__title font-sans font-normal text-text-secondary leading-normal"
          style={{ fontSize: "var(--font-size-md)" }}
        >
          {role}
        </span>
      </div>

      {chips.length > 0 && (
        <div className="tc-profile-block__chips flex flex-wrap gap-[10px]">
          {chips.map((chip) => (
            <a
              key={chip.label}
              href={chip.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "tc-profile-block__chip inline-flex items-center justify-center px-[5px] py-[2px]",
                "rounded-xs bg-surface-chip",
                "font-mono text-xs uppercase text-text-chip whitespace-nowrap",
                "hover:text-text-primary transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              )}
            >
              {chip.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
