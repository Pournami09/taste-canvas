import { cn } from "@/lib/cn";

export function Kbd({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center rounded px-1.5 py-0.5",
        "font-mono text-[10px] text-text-tertiary",
        "border border-border-subtle bg-surface-raised",
        "shadow-[0_1px_0_var(--border-default)]",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
