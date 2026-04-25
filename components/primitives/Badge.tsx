import { cn } from "@/lib/cn";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "accent" | "destructive" | "success";
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "font-mono text-[10px] tracking-[var(--letter-spacing-wider)] uppercase",
        "border border-[var(--badge-border)]",
        variant === "default" && "bg-[var(--badge-bg)] text-[var(--badge-fg)]",
        variant === "accent" && "bg-accent-subtle text-accent-default border-accent-default/30",
        variant === "destructive" && "bg-red-950/20 text-destructive-default border-destructive-default/30",
        variant === "success" && "bg-green-950/20 text-success-default border-success-default/30",
        className,
      )}
      {...props}
    />
  );
}
